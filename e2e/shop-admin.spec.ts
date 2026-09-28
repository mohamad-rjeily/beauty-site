import { type BrowserContext, type Page } from '@playwright/test'

import { Api, firstError, type Order, type Product } from './helpers/api'
import { expect, test, testName, type Locale } from './helpers/fixtures'
import { noSideScroll, usd } from './helpers/shop'

/**
 * 21. The owner's side of an order, on her phone: the orders list and an order's page in the
 * English and Arabic admin, the one-tap WhatsApp chat, confirming and cancelling (stock moves),
 * and the error when there isn't enough stock to confirm, in her language.
 */

const SAGE = 'rgb(94, 107, 85)'
const PHONE = '+96171123456'

const adminPage = async (context: BrowserContext, lang: Locale): Promise<Page> => {
  await context.addCookies([
    { name: 'payload-lng', value: lang, url: test.info().project.use.baseURL as string },
  ])
  await Api.loginContext(context)
  return context.newPage()
}

const newOrder = async (api: Api, product: Product, quantity: number, label: string) => {
  const res = await api.createOrder({
    customerName: testName(label),
    phone: PHONE,
    fulfillment: 'delivery',
    area: 'E2E Achrafieh',
    street: 'E2E Sursock street',
    building: 'E2E Rose building',
    floor: '3',
    landmark: 'E2E the pharmacy',
    items: [{ product: product.id, quantity }],
  })
  expect(res.status, firstError(res)).toBe(201)
  return res.body.doc as Order
}

for (const lang of ['en', 'ar'] as Locale[]) {
  test(`orders list and order page fit the phone, with the WhatsApp chat (${lang} admin)`, async ({
    context,
    api,
  }, testInfo) => {
    const [product] = await api.productsOnSale(3)
    const order = await newOrder(api, product, 1, `admin ${lang}`)
    const page = await adminPage(context, lang)

    await page.goto('/admin/collections/orders')
    const cell = page.locator('.order-cell', { hasText: order.customerName })
    await expect(cell).toBeVisible()
    await expect(cell).toContainText(order.orderNumber)
    await expect(cell).toContainText(usd(order.total.amount))
    await expect(page.locator('tr', { has: cell }).locator('.order-status--new')).toBeVisible()
    expect(await noSideScroll(page), 'no sideways scroll on the list').toBe(true)
    await page.screenshot({
      path: `test-results/screens/${testInfo.project.name}-${lang}-admin-orders.png`,
    })

    await cell.click()
    const summary = page.locator('.order-summary')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText(order.orderNumber)
    for (const part of [
      'E2E Achrafieh',
      'E2E Sursock street',
      'E2E Rose building',
      'E2E the pharmacy',
    ]) {
      await expect(summary).toContainText(part)
    }
    await expect(summary).toContainText('+961 71 123 456')

    const chat = summary.locator('a.order-summary__whatsapp')
    await expect(chat).toHaveAttribute('href', 'https://wa.me/96171123456')
    await expect(chat).toHaveAttribute('target', '_blank')
    await expect(chat).toHaveText(
      lang === 'ar' ? 'تحدّثي مع العميلة على واتساب' : 'Chat with the customer on WhatsApp',
    )
    expect(await chat.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(SAGE)
    const box = (await chat.boundingBox())!
    expect(box.height, 'an easy tap target').toBeGreaterThanOrEqual(44)
    expect(await noSideScroll(page), 'no sideways scroll on the order').toBe(true)
    await page.screenshot({
      path: `test-results/screens/${testInfo.project.name}-${lang}-admin-order.png`,
    })
  })
}

test('confirming takes the stock, cancelling puts it back; delivered is final', async ({ api }) => {
  const [product] = await api.productsOnSale(3)
  const order = await newOrder(api, product, 2, 'stock trip')

  expect((await api.setOrderStatus(order.id, 'confirmed')).status).toBe(200)
  expect((await api.product(product.id)).stock).toBe(product.stock - 2)
  expect((await api.setOrderStatus(order.id, 'cancelled')).status).toBe(200)
  expect((await api.product(product.id)).stock).toBe(product.stock)

  const delivered = await newOrder(api, product, 1, 'delivered')
  await api.setOrderStatus(delivered.id, 'confirmed')
  await api.setOrderStatus(delivered.id, 'delivered')
  const refused = await api.setOrderStatus(delivered.id, 'cancelled')
  expect(refused.status).toBe(400)
  expect(firstError(refused)).toContain('A delivered order is final')
  expect((await api.product(product.id)).stock, 'still taken').toBe(product.stock - 1)
})

test('not enough stock to confirm: the error names the product and what is left (EN and AR)', async ({
  context,
  api,
}, testInfo) => {
  const [product] = await api.productsOnSale(3)
  const arName = (await api.product(product.id, 'ar')).name
  const needed = product.stock
  const order = await newOrder(api, product, needed, 'short stock')
  await api.updateProduct(product.id, { stockAdjustment: -1 })
  const left = needed - 1

  const en = await api.setOrderStatus(order.id, 'confirmed', 'en')
  expect(en.status).toBe(400)
  expect(firstError(en)).toBe(
    `Can't confirm yet. This order needs ${needed} of "${product.name}", and only ${left} ${left === 1 ? 'is' : 'are'} left. Add stock on the product, or cancel the order.`,
  )
  // The toast shows the message itself, not "The following field is invalid".
  expect(en.body.errors?.[0]?.message).toBe(firstError(en))

  const ar = await api.setOrderStatus(order.id, 'confirmed', 'ar')
  expect(firstError(ar)).toBe(
    `لا يمكن تأكيد الطلب بعد. يحتاج ${needed} من "${arName}"، وبقي ${left} فقط. أضيفي إلى مخزون المنتج، أو ألغي الطلب.`,
  )
  expect((await api.product(product.id)).stock, 'nothing taken').toBe(left)

  // The same, in the Arabic admin on the phone.
  const page = await adminPage(context, 'ar')
  await page.goto(`/admin/collections/orders/${order.id}`)
  await page.locator('#field-status .rs__control').click()
  await page.locator('.rs__option', { hasText: 'مؤكد' }).first().click()
  await page.locator('#action-save').click()
  const toast = page.locator('[data-sonner-toast][data-type="error"]')
  await expect(toast).toContainText(`يحتاج ${needed} من "${arName}"`)
  await expect(toast).toContainText(`وبقي ${left} فقط`)
  await page.screenshot({
    path: `test-results/screens/${testInfo.project.name}-ar-admin-stock-error.png`,
  })
  await api.updateProduct(product.id, { stockAdjustment: 1 })
})

test('orders are private: nothing without a login', async ({ api }) => {
  const res = await api.anonymousOrders()
  expect(res.status).toBe(403)
  expect(res.body.docs).toBeUndefined()
})
