import { dict, expect, test, testName, type Locale } from './helpers/fixtures'
import { CheckoutForm, cartLines, noSideScroll, seedCart, usd } from './helpers/shop'

/**
 * 20. The shop checkout, end to end on the phone: products into the cart, the details form,
 * the order saved in the admin as "new" with the server's prices, and the success screen with
 * the sage "Send on WhatsApp" button carrying the same order. Cash only, nothing paid online.
 */

const SAGE = 'rgb(94, 107, 85)' // DESIGN.md: sage is WhatsApp, and only WhatsApp

test('delivery order from the product pages: saved as new, WhatsApp message, cart cleared @desktop', async ({
  page,
  api,
}, testInfo) => {
  const t = dict.en
  const [first, second] = await api.productsOnSale(3)
  const fee = (await api.settings('en')).shop?.deliveryFee?.amount ?? null

  // Two of the first product, one of the second, through the product pages.
  await page.goto(`/en/shop/${first.slug}`)
  await page.getByRole('button', { name: t.shopPage.more }).click()
  await page.getByRole('button', { name: t.shopPage.addToCart }).click()
  await expect(page.getByText(t.cart.added)).toBeVisible()
  await page.goto(`/en/shop/${second.slug}`)
  await page.getByRole('button', { name: t.shopPage.addToCart }).click()
  await expect(page.getByText(t.cart.added)).toBeVisible()

  const checkout = new CheckoutForm(page, 'en')
  await checkout.open()
  const subtotal = 2 * first.price.amount + second.price.amount
  await expect(checkout.totalsRow(t.cart.subtotal)).toContainText(usd(subtotal))

  const name = testName('delivery')
  await checkout.fill({
    name,
    phone: '03 123 456',
    fulfillment: 'delivery',
    area: 'E2E Achrafieh',
    street: 'E2E Sursock street',
    building: 'E2E Rose building',
    floor: '3',
    landmark: 'E2E the pharmacy',
    notes: 'E2E please call when downstairs',
  })
  // The delivery row's value is short: the label already says "Delivery".
  await expect(checkout.totalsRow(t.checkout.deliveryFee)).toContainText(
    fee === null ? t.checkout.deliveryFeeOnWhatsApp : usd(fee),
  )
  await checkout.submitButton.click()

  await expect(checkout.doneHeading).toBeVisible()
  const number = await checkout.orderNumber()
  expect(number).toMatch(/^[A-Z2-9]{6}$/)
  await expect(page.getByText(t.checkout.pending.split(' ·')[0])).toBeVisible()

  // Saved in the admin exactly once, as "new", priced by the server.
  const [order, ...others] = await api.ordersNamed(name)
  expect(others, 'one order').toHaveLength(0)
  expect(order.status).toBe('new')
  expect(order.orderNumber).toBe(number)
  expect(order.locale).toBe('en')
  expect(order.phone).toBe('+9613123456')
  expect(order.fulfillment).toBe('delivery')
  expect([order.area, order.street, order.building, order.floor, order.landmark]).toEqual([
    'E2E Achrafieh',
    'E2E Sursock street',
    'E2E Rose building',
    '3',
    'E2E the pharmacy',
  ])
  expect(
    order.items.map((i) => [i.product, i.quantity, i.productName, i.unitPrice.amount]),
  ).toEqual([
    [first.id, 2, first.name, first.price.amount],
    [second.id, 1, second.name, second.price.amount],
  ])
  expect(order.total.amount).toBe(subtotal + (fee ?? 0))

  // The WhatsApp button: sage, a new tab, the same order in the message.
  const button = checkout.whatsappButton
  await expect(button).toHaveAttribute('target', '_blank')
  expect(await button.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(SAGE)
  const message = await checkout.whatsappMessage()
  const m = t.checkout.message
  expect(message).toContain(m.orderNumber.replace('{number}', number))
  expect(message).toContain(`• 2 × ${first.name}: ${usd(2 * first.price.amount)}`)
  expect(message).toContain(`• 1 × ${second.name}: ${usd(second.price.amount)}`)
  expect(message).toContain(
    fee === null
      ? m.totalPlusDelivery.replace('{total}', usd(subtotal))
      : `${m.total}: ${usd(subtotal + fee)}`,
  )
  expect(message).toContain(
    `${m.deliverTo}: E2E Achrafieh, E2E Sursock street, E2E Rose building, floor 3, near E2E the pharmacy`,
  )
  expect(message).toContain(`${m.phone}: +961 3 123 456`)
  expect(message).toContain(`${m.notes}: E2E please call when downstairs`)
  expect(message.endsWith(m.payment)).toBe(true)
  expect(message).not.toContain('US$')

  // The summary on screen: the delivery value is short there too.
  if (fee === null) {
    await expect(
      page.locator('dl div', { has: page.locator('dt', { hasText: t.checkout.deliveryFee }) }),
    ).toContainText(t.checkout.deliveryFeeOnWhatsApp)
  }
  expect(await cartLines(page), 'the cart is emptied').toEqual([])
  expect(await noSideScroll(page)).toBe(true)
  await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-en-shop-done.png` })
})

test('pickup order in Arabic: right to left, Arabic message and names, sage button', async ({
  page,
  api,
}, testInfo) => {
  const locale: Locale = 'ar'
  const t = dict.ar
  const [, product] = await api.productsOnSale(3, 'ar')
  await seedCart(page, locale, [{ productId: product.id, quantity: 1 }])

  const checkout = new CheckoutForm(page, locale)
  await checkout.open()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  const name = testName('ar pickup')
  await checkout.fill({ name, phone: '٠٣ ١٢٣ ٤٥٦', fulfillment: 'pickup' })
  await expect(checkout.form).toContainText(t.checkout.pickupFrom)
  await expect(checkout.totalsRow(t.checkout.deliveryFee)).toHaveCount(0)
  await checkout.submitButton.click()

  await expect(checkout.doneHeading).toBeVisible()
  const [order] = await api.ordersNamed(name)
  expect(order.locale).toBe('ar')
  expect(order.fulfillment).toBe('pickup')
  expect(order.phone).toBe('+9613123456')
  expect(order.items[0].productName, 'the name in the language she ordered in').toBe(product.name)
  expect(order.deliveryFee?.amount ?? null).toBeNull()
  expect(order.total.amount).toBe(product.price.amount)

  expect(await checkout.whatsappButton.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    SAGE,
  )
  const message = await checkout.whatsappMessage()
  const m = t.checkout.message
  expect(message.startsWith(m.intro)).toBe(true)
  expect(message).toContain(`• 1 × ${product.name}: ${usd(product.price.amount)}`)
  expect(message).toContain(`${m.total}: ${usd(product.price.amount)}`)
  expect(message).toContain(m.pickup)
  expect(message).not.toContain(m.deliveryFeeOnWhatsApp)
  expect(message).not.toContain('US$')
  expect(await noSideScroll(page)).toBe(true)
  await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-ar-shop-done.png` })
})

test('a double tap on "Send my order" saves one order', async ({ page, api }) => {
  const [product] = await api.productsOnSale(3)
  await seedCart(page, 'en', [{ productId: product.id, quantity: 1 }])
  const checkout = new CheckoutForm(page, 'en')
  await checkout.open()
  const name = testName('double tap')
  await checkout.fill({ name, phone: '03 123 456', fulfillment: 'pickup' })
  await checkout.submitButton.dblclick()
  await expect(checkout.doneHeading).toBeVisible()
  await page.waitForTimeout(1500) // a second request, if any, has landed by now
  expect(await api.ordersNamed(name)).toHaveLength(1)
})

test('delivery without area and street: both errors shown, nothing saved', async ({
  page,
  api,
}) => {
  const t = dict.en.checkout
  const [product] = await api.productsOnSale(3)
  await seedCart(page, 'en', [{ productId: product.id, quantity: 1 }])
  const checkout = new CheckoutForm(page, 'en')
  await checkout.open()
  const name = testName('no address')
  await checkout.fill({ name, phone: '03 123 456', fulfillment: 'delivery' })
  await checkout.submitButton.click()
  await expect(checkout.form).toContainText(t.errors.area)
  await expect(checkout.form).toContainText(t.errors.street)
  await expect(page.locator('#order-area')).toBeFocused()
  await expect(checkout.doneHeading).toHaveCount(0)
  expect(await api.ordersNamed(name)).toHaveLength(0)
})

test('the price changed after adding: the cart says old and new, the order uses the new one', async ({
  page,
  api,
}) => {
  const t = dict.en.cart
  const [product] = await api.productsOnSale(3)
  const newPrice = product.price.amount + 150
  await seedCart(page, 'en', [{ productId: product.id, quantity: 1 }])
  const checkout = new CheckoutForm(page, 'en')
  await checkout.open() // she sees today's price (remembered in this browser)

  try {
    expect(
      (await api.updateProduct(product.id, { price: { amount: newPrice, currency: 'USD' } }))
        .status,
    ).toBe(200)
    await checkout.open()
    const notice = page.locator('main').getByRole('alert')
    await expect(notice).toContainText(`“${product.name}”`)
    await expect(notice).toContainText(usd(product.price.amount))
    await expect(notice).toContainText(usd(newPrice))
    await expect(checkout.totalsRow(t.subtotal)).toContainText(usd(newPrice))

    const name = testName('new price')
    await checkout.fill({ name, phone: '03 123 456', fulfillment: 'pickup' })
    await checkout.submitButton.click()
    await expect(checkout.doneHeading).toBeVisible()
    const [order] = await api.ordersNamed(name)
    expect(order.items[0].unitPrice.amount).toBe(newPrice)
    expect(order.total.amount).toBe(newPrice)
  } finally {
    await api.updateProduct(product.id, { price: product.price })
  }
})

test('fewer left than in the cart: the quantity is lowered, with a notice', async ({
  page,
  api,
}) => {
  const [product] = await api.productsOnSale(3)
  const takeAway = product.stock - 1
  await seedCart(page, 'en', [{ productId: product.id, quantity: 3 }])
  try {
    expect((await api.updateProduct(product.id, { stockAdjustment: -takeAway })).status).toBe(200)
    const checkout = new CheckoutForm(page, 'en')
    await checkout.open()
    await expect(page.locator('main').getByRole('alert')).toContainText(`Only 1 of “${product.name}” left`)
    expect(await cartLines(page)).toEqual([{ productId: product.id, quantity: 1 }])
  } finally {
    await api.updateProduct(product.id, { stockAdjustment: takeAway })
  }
})

test('fashion items are never on the shop, and their page is not found', async ({ page, api }) => {
  const created = await api.createProduct({
    name: testName('scarf'),
    type: 'fashion',
    price: { amount: 4000, currency: 'USD' },
    stockAdjustment: 2,
    active: true,
  })
  expect(created.status).toBe(201)
  const scarf = created.body.doc
  try {
    expect((await api.publicProducts()).some((p) => p.id === scarf.id)).toBe(false)
    await page.goto('/en/shop')
    await expect(page.locator('main')).not.toContainText(scarf.name)
    const res = await page.goto(`/en/shop/${scarf.slug}`)
    expect(res?.status()).toBe(404)
  } finally {
    await api.deleteProduct(scarf.id)
  }
})
