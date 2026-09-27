import { TEST_PREFIX } from './visitors'
import { BookingPage, dict, expect, test, testName } from './helpers/fixtures'

/**
 * 10. Spam protection: a filled honeypot looks like success but saves nothing; quick repeated
 * sends from one visitor hit the rate limit (5 per 10 minutes) with a friendly message.
 */

test('honeypot filled: success shown, nothing saved', async ({ page, api, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const b = new BookingPage(page, 'en')
  const name = testName('honeypot')
  await b.goto(slotServices[0].slug)
  await b.pickSlot()
  await b.fillDetails({ name, phone: '+961 3 123 456' })
  await page.locator('input[name="website"]').fill('https://spam.example', { force: true })
  await b.submit()
  await b.expectDone()
  await page.waitForTimeout(1500)
  expect(await api.bookingsNamed(name), 'bot booking must not be saved').toHaveLength(0)
})

test('rate limit: the 6th send in a row gets a friendly message', async ({ page, api, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const service = slotServices[0]
  const b = new BookingPage(page, 'en')
  const prefix = testName('rate')
  await b.goto(service.slug)

  for (let i = 1; i <= 6; i++) {
    await b.pickSlot({ day: 'last', which: 'first' })
    await b.fillDetails({ name: `${prefix} ${i}`, phone: '+961 3 123 456' })
    await b.submit()
    if (i <= 5) {
      await b.expectDone()
      await page.getByRole('button', { name: dict.en.booking.bookAnother }).click()
      await b.chooseService(service)
    } else {
      await expect(b.notice.filter({ hasText: dict.en.booking.rateLimited })).toBeVisible()
      await expect(b.doneHeading).toHaveCount(0)
    }
  }

  const saved = await api.bookingsNamedLike(prefix)
  expect(saved.map((s) => s.customerName).sort(), 'only the first 5 are saved').toEqual(
    [1, 2, 3, 4, 5].map((i) => `${prefix} ${i}`),
  )
  expect(prefix.startsWith(TEST_PREFIX)).toBe(true)
})
