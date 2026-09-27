import { TZ } from './helpers/beirut'
import { BookingPage, dict, expect, test, testName } from './helpers/fixtures'

/**
 * 11. Double-tap on "Send", browser Back / Forward and refresh.
 *
 * Expected navigation (business decision):
 * - each step is a history entry: Back from step 3 -> step 2, Back from step 2 -> step 1,
 *   keeping service, day, time and typed details; Back from step 1 leaves /book; Forward works;
 * - refresh keeps the customer on the same step, or the nearest one WITH a clear explanation;
 * - after a successful booking, Back never resubmits nor shows the filled form;
 * - a time taken meanwhile gives the friendly "just taken" message with fresh times.
 */

const t = dict.en.booking

test('double-tap on Send creates exactly one booking', async ({ page, api, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const b = new BookingPage(page, 'en')
  const name = testName('double tap')
  await b.goto(slotServices[0].slug)
  await b.pickSlot({ day: 1, which: 'last' })
  await b.fillDetails({ name, phone: '+961 3 123 456' })
  await b.submitButton.dblclick()
  await b.expectDone()
  await page.waitForTimeout(2000)
  expect(await api.bookingsNamed(name), 'one booking only').toHaveLength(1)
})

test('browser Back and Forward move between steps, keeping the answers', async ({ page, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const service = slotServices[0]
  const b = new BookingPage(page, 'en')
  const name = testName('history')

  await page.goto('/en')
  await b.goto()
  await b.chooseService(service)
  const slot = await b.pickSlot({ day: 1, which: 'first' })
  await b.fillDetails({ name, phone: '+961 3 123 456' })

  await page.goBack()
  await expect(page, 'Back from step 3 stays on /book').toHaveURL(/\/en\/book/)
  await b.expectOpen(2)
  await expect(b.dayTiles.nth(slot.dayIndex)).toHaveAttribute('aria-pressed', 'true')
  await expect(b.chip(slot.time)).toHaveAttribute('aria-pressed', 'true')

  await page.goBack()
  await expect(page).toHaveURL(/\/en\/book/)
  await b.expectOpen(1)
  await expect(b.serviceOption(service.name).locator('input')).toBeChecked()

  await page.goForward()
  await b.expectOpen(2)
  await page.goForward()
  await b.expectOpen(3)
  await expect(b.nameInput).toHaveValue(name)
  await expect(b.phoneInput).toHaveValue('+961 3 123 456')

  await page.goBack()
  await page.goBack()
  await page.goBack()
  await expect(page, 'Back from step 1 leaves /book').not.toHaveURL(/\/book/)
})

test('refresh on step 2 keeps the service and the flow works', async ({ page, api, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const service = slotServices[0]
  const b = new BookingPage(page, 'en')
  const name = testName('refresh 2')
  await b.goto()
  await b.chooseService(service)
  await page.reload()
  await b.ready()
  await b.expectOpen(2)
  await expect(b.step(1)).toContainText(service.name)
  await b.pickSlot({ day: 2, which: 'last' })
  await b.fillDetails({ name, phone: '+961 3 123 456' })
  await b.submit()
  await b.expectDone()
  expect(await api.bookingsNamed(name)).toHaveLength(1)
})

test('refresh on step 3 keeps the step, or explains why it moved', async ({ page, api, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const b = new BookingPage(page, 'en')
  const name = testName('refresh 3')
  await b.goto(slotServices[0].slug)
  await b.pickSlot({ day: 2, which: 'first' })
  await b.fillDetails({ name, phone: '+961 3 123 456' })
  await page.reload()
  await b.ready()

  const step = await b.openStep()
  if (step !== 3) {
    // Landing on an earlier step is fine only with a visible explanation.
    await expect(b.notice, `refresh on step 3 landed on step ${step} without an explanation`).toBeVisible({
      timeout: 3000,
    })
    await b.pickSlot({ day: 2, which: 'first' })
  }
  await b.fillDetails({ name, phone: '+961 3 123 456' })
  await b.submit()
  await b.expectDone()
  expect(await api.bookingsNamed(name)).toHaveLength(1)
})

test('Back after a successful booking never resubmits or shows the filled form', async ({
  page,
  api,
  slotServices,
}) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const b = new BookingPage(page, 'en')
  const name = testName('back after')
  await page.goto('/en')
  await b.goto(slotServices[0].slug)
  await b.pickSlot({ day: 3, which: 'last' })
  await b.fillDetails({ name, phone: '+961 3 123 456' })
  await b.submit()
  await b.expectDone()

  await page.goBack()
  await page.waitForLoadState()
  if (/\/book/.test(page.url())) {
    await b.ready()
    expect(await b.openStep(), 'a fresh step 1').toBe(1)
    await expect(b.nameInput).toHaveCount(0)
  }
  await page.goForward().catch(() => null)
  await page.waitForTimeout(2000)
  expect(await api.bookingsNamed(name), 'still exactly one booking').toHaveLength(1)
})

test('time taken while going back and forth: friendly message and fresh times', async ({
  page,
  api,
  slotServices,
}) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const service = slotServices[0]
  const b = new BookingPage(page, 'en')
  const name = testName('taken meanwhile')
  await b.goto(service.slug)
  const slot = await b.pickSlot({ day: 4, which: 'last' })
  await b.fillDetails({ name, phone: '+961 3 123 456' })

  // Back to the times (the page's own Change button), and meanwhile someone takes that time.
  await b.step(2).getByRole('button', { name: new RegExp(`^${t.change}`) }).click()
  await b.expectOpen(2)
  const other = await api.createBooking({
    customerName: testName('taker'),
    phone: '+9613123456',
    service: service.id,
    startTime: new Date(slot.instant).toISOString(),
    startTime_tz: TZ,
  })
  expect(other.status).toBe(201)

  await b.chip(slot.time).click()
  await b.expectOpen(3)
  await b.submit()
  await expect(b.notice.filter({ hasText: t.slotTaken })).toBeVisible()
  await b.expectOpen(2)
  await expect(b.timeChips.first()).toBeVisible()
  if (await b.dayTiles.nth(slot.dayIndex).getAttribute('aria-pressed') === 'true') {
    expect(await b.chipTimes(), 'taken time gone from the fresh list').not.toContain(slot.time)
  }
  expect(await api.bookingsNamed(name)).toHaveLength(0)
})

test('Change twice, then Back: the same number of Back presses leaves /book', async ({ page, slotServices }) => {
  const service = slotServices[0]
  const b = new BookingPage(page, 'en')
  const change = (n: 1 | 2) => b.step(n).getByRole('button', { name: new RegExp(`^${t.change}`) })

  await page.goto('/en')
  await b.goto()
  await b.chooseService(service)
  const first = await b.pickSlot({ day: 1, which: 'first' })

  // Step 3 -> Change to step 2 -> another time, twice.
  for (const which of ['last', 'middle'] as const) {
    await change(2).click()
    await b.expectOpen(2)
    await b.pickSlot({ day: first.dateKey, which })
  }

  await page.goBack()
  await b.expectOpen(2)
  await page.goBack()
  await b.expectOpen(1)
  await page.goBack()
  await expect(page, 'third Back leaves /book, as without any Change').not.toHaveURL(/\/book/)
})

test('refresh on step 2 keeps the selected day', async ({ page, slotServices }) => {
  const b = new BookingPage(page, 'en')
  await b.goto(slotServices[0].slug)
  await b.waitForDays()
  const open = await b.openTileIndexes()
  const day = open[Math.min(2, open.length - 1)]
  await b.selectDay(day)

  await page.reload()
  await b.ready()
  await b.expectOpen(2)
  await expect(b.dayTiles.nth(day)).toHaveAttribute('aria-pressed', 'true')
})

test('refresh on step 3 keeps name, phone and notes; they are gone once sent', async ({
  page,
  api,
  slotServices,
}) => {
  const b = new BookingPage(page, 'en')
  const name = testName('refresh details')
  await b.goto(slotServices[0].slug)
  await b.pickSlot({ day: 2, which: 'middle' })
  await b.fillDetails({ name, phone: '03 123 456', notes: 'E2E kept' })

  await page.reload()
  await b.ready()
  await b.expectOpen(3)
  await expect(b.nameInput).toHaveValue(name)
  await expect(b.phoneInput).toHaveValue('03 123 456')
  await expect(b.notesInput).toHaveValue('E2E kept')
  expect(page.url(), 'no personal details in the address').not.toMatch(/E2E|kept|456/)

  await b.submit()
  await b.expectDone()
  expect(await api.bookingsNamed(name)).toHaveLength(1)
  const stored = await page.evaluate(() => sessionStorage.getItem('book:details'))
  expect(stored ?? '', 'details removed after sending').not.toContain(name)
})

for (const locale of ['en', 'ar'] as const) {
  test(`refresh on step 3 after the time was taken: step 2, same day, a notice (${locale})`, async ({
    page,
    api,
    slotServices,
  }) => {
    const service = slotServices[0]
    const b = new BookingPage(page, locale)
    await b.goto(service.slug)
    // A day with other free times, so it stays open once this time is taken.
    await b.waitForDays()
    const keys = await b.tileDates()
    let day: string | undefined
    for (const i of (await b.openTileIndexes()).slice(3)) {
      await b.selectDay(i)
      if ((await b.chipTimes()).length >= 2) {
        day = keys[i]
        break
      }
    }
    expect(day, 'an open day with at least two free times').toBeTruthy()
    const slot = await b.pickSlot({ day, which: 'first' })
    await b.fillDetails({ name: testName(`gone ${locale}`), phone: '+961 3 123 456' })

    const other = await api.createBooking({
      customerName: testName('taker'),
      phone: '+9613123456',
      service: service.id,
      startTime: new Date(slot.instant).toISOString(),
      startTime_tz: TZ,
    })
    expect(other.status).toBe(201)

    await page.reload()
    await b.ready()
    await b.expectOpen(2)
    await expect(b.notice.filter({ hasText: dict[locale].booking.timeGoneAfterReload })).toBeVisible()
    await expect(b.dayTiles.nth(slot.dayIndex), 'the same day is still selected').toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(await b.chipTimes()).not.toContain(slot.time)
  })
}
