import { BookingPage, dict, expect, test, testName, type Locale } from './helpers/fixtures'

/**
 * 9. Form validation. Phone rules follow the business decision (all customers are in
 * Lebanon, so a number without a country code IS Lebanese):
 * - local, spaced, dashed, bracketed, 00-prefixed and Arabic/Persian-digit numbers are
 *   accepted and stored as +961 E.164;
 * - + / 00 with another country code is kept as that international number;
 * - anything that doesn't reduce to a valid number is refused with a friendly message
 *   showing a local example (03 123 456).
 */

const ACCEPTED: [input: string, stored: string][] = [
  ['03 123 456', '+9613123456'],
  ['03123456', '+9613123456'],
  ['3123456', '+9613123456'],
  ['71123456', '+96171123456'],
  ['71 123 456', '+96171123456'],
  ['+961 3 123 456', '+9613123456'],
  ['00961 71 123 456', '+96171123456'],
  ['01 234 567', '+9611234567'],
  ['03-123-456', '+9613123456'],
  ['(03) 123.456', '+9613123456'],
  ['٠٣ ١٢٣ ٤٥٦', '+9613123456'],
  ['۰۳ ۱۲۳ ۴۵۶', '+9613123456'],
  ['+44 20 7946 0958', '+442079460958'],
  ['0044 20 7946 0958', '+442079460958'],
]

const REJECTED = ['abc', '123', '03 123 45', '+961 3 123 456 789 012']

/** Opens the details step of the first slot service. */
const toDetails = async (b: BookingPage, slug: string) => {
  await b.goto(slug)
  await b.pickSlot({ day: 'first', which: 'first' })
}

for (const [input, stored] of ACCEPTED) {
  test(`phone accepted: "${input}" -> ${stored}`, async ({ page, api, slotServices }) => {
    test.skip(slotServices.length === 0, 'No active time-slot service.')
    const b = new BookingPage(page, 'en')
    const name = testName('phone')
    await toDetails(b, slotServices[0].slug)
    await b.fillDetails({ name, phone: input })
    await b.submit()
    await expect(b.doneHeading.or(page.getByText(dict.en.booking.errors.phone))).toBeVisible()
    await expect(b.doneHeading, `"${input}" should be accepted`).toBeVisible()
    const [saved] = await api.bookingsNamed(name)
    expect(saved?.phone, 'stored in E.164').toBe(stored)
  })
}

for (const input of REJECTED) {
  test(`phone refused: "${input}"`, async ({ page, api, slotServices }) => {
    test.skip(slotServices.length === 0, 'No active time-slot service.')
    const b = new BookingPage(page, 'en')
    const name = testName('bad phone')
    await toDetails(b, slotServices[0].slug)
    await b.fillDetails({ name, phone: input })
    await b.submit()
    await expect(page.locator('#book-phone-error')).toBeVisible()
    await expect(b.doneHeading).toHaveCount(0)
    expect(await api.bookingsNamed(name)).toHaveLength(0)
  })
}

for (const locale of ['en', 'ar'] as Locale[]) {
  test(`phone error message shows a local example, 03 123 456 (${locale})`, async ({ page, slotServices }) => {
    test.skip(slotServices.length === 0, 'No active time-slot service.')
    const b = new BookingPage(page, locale)
    await toDetails(b, slotServices[0].slug)
    await b.fillDetails({ name: testName('msg'), phone: 'abc' })
    await b.submit()
    const error = page.locator('#book-phone-error')
    await expect(error).toBeVisible()
    await expect(error).toContainText('03 123 456')
  })
}

test('name: empty or blank is refused', async ({ page, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const b = new BookingPage(page, 'en')
  await toDetails(b, slotServices[0].slug)
  for (const name of ['', '   ']) {
    await b.fillDetails({ name, phone: '+961 3 123 456' })
    await b.submit()
    await expect(page.getByText(dict.en.booking.errors.name)).toBeVisible()
    await expect(b.doneHeading).toHaveCount(0)
  }
})

test('name: Arabic name accepted and stored as typed', async ({ page, api, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const b = new BookingPage(page, 'ar')
  const name = testName('ليلى حداد')
  await toDetails(b, slotServices[0].slug)
  await b.fillDetails({ name, phone: '+961 3 123 456' })
  await b.submit()
  await b.expectDone()
  const [saved] = await api.bookingsNamed(name)
  expect(saved?.customerName).toBe(name)
})

test('notes: very long notes are capped at 1,000 characters and saved', async ({ page, api, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const b = new BookingPage(page, 'en')
  const name = testName('long notes')
  await toDetails(b, slotServices[0].slug)
  await b.fillDetails({ name, phone: '+961 3 123 456', notes: 'x'.repeat(5000) })
  const typed = await b.notesInput.inputValue()
  expect(typed.length, 'the field stops at 1,000 characters').toBeLessThanOrEqual(1000)
  await b.submit()
  await b.expectDone()
  const [saved] = await api.bookingsNamed(name)
  expect(saved?.notes?.length).toBe(typed.length)
})
