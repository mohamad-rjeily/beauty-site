import { BookingPage, dict, expect, test, testName, type Locale } from './helpers/fixtures'

/**
 * 13. Prices read "$80" (or "$12.50") in both languages: "$" before Western digits, never
 * "US$" nor "80,00". In Arabic each price sits in <bdi dir="ltr"> so the "$" stays with its
 * number, and the WhatsApp message uses the same plain form.
 */

const PRICE = /^\$\d{1,3}(,\d{3})*(\.\d{2})?$/

for (const locale of ['en', 'ar'] as Locale[]) {
  test(`prices show "$" and never "US$" (${locale})`, async ({ page, api, slotServices }) => {
    const service = (await api.services(locale)).find((s) => s.id === slotServices[0].id)!
    const b = new BookingPage(page, locale)
    await b.goto()
    await expect(page.locator('body')).not.toContainText('US$')
    const prices = await b.step(1).locator('label bdi[dir="ltr"]').allInnerTexts()
    expect(prices.length, 'every service shows its price').toBeGreaterThan(0)
    for (const price of prices) expect(price.trim(), 'price format').toMatch(PRICE)

    // The chosen service's price in the step 1 summary line.
    await b.chooseService(service)
    await expect(b.step(1).locator('bdi[dir="ltr"]').first()).toHaveText(PRICE)

    await page.goto(`/${locale}/services`)
    await expect(page.locator('body')).not.toContainText('US$')
    const listed = await page.locator('main bdi[dir="ltr"]').allInnerTexts()
    expect(listed.length, 'prices on the services page').toBeGreaterThan(0)
    for (const price of listed) expect(price.trim()).toMatch(PRICE)

    await page.goto(`/${locale}`)
    await expect(page.locator('body')).not.toContainText('US$')
    for (const price of await page.locator('main bdi[dir="ltr"]').allInnerTexts()) {
      expect(price.trim(), 'home page price').toMatch(PRICE)
    }
  })
}

test('Arabic WhatsApp message: price as "$80", no "US$"', async ({ page, api, slotServices }) => {
  const service = (await api.services('ar')).find((s) => s.id === slotServices[0].id)!
  const b = new BookingPage(page, 'ar')
  const t = dict.ar.booking
  await b.goto(service.slug)
  await b.pickSlot({ day: 'last', which: 'last' })
  await b.fillDetails({ name: testName('ar price'), phone: '03 123 456' })
  await b.submit()
  await b.expectDone()
  await expect(page.locator('body')).not.toContainText('US$')

  const link = page.locator('a[href^="https://wa.me/"]').filter({ hasText: t.sendOnWhatsApp })
  const text = new URL((await link.getAttribute('href'))!).searchParams.get('text') ?? ''
  expect(text).not.toContain('US$')
  const line = text.split('\n').find((l) => l.startsWith(`• ${t.summary.price}: `))
  expect(line, 'a price line').toBeTruthy()
  expect(line!.slice(`• ${t.summary.price}: `.length)).toMatch(PRICE)
  expect(text, 'the number as saved').toContain(`• ${t.summary.phone}: +961 3 123 456`)
})
