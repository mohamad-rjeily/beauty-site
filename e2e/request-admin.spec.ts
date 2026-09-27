import { firstError } from './helpers/api'
import { beirutInstant, hhmm, MINUTE, rangesOf, TZ } from './helpers/beirut'
import { BookingPage, dict, expect, test, testName, type Locale } from './helpers/fixtures'

/**
 * 6. Request mode (bridal, events): the customer sends a date, no time. Once the owner
 * confirms it with a start and end time, that time plus the break is blocked on the site.
 * 8. Admin rules: the owner may book outside working hours, never over another booking.
 */

for (const locale of ['en', 'ar'] as Locale[]) {
  test(`request: sent without a time (${locale})`, async ({ page, api, requestServices }, testInfo) => {
    test.skip(requestServices.length === 0, 'No active request service.')
    const service = (await api.services(locale)).find((s) => s.id === requestServices[0].id)!
    const b = new BookingPage(page, locale)
    const t = dict[locale].booking
    const name = testName(`request ${locale}`)
    const date = new Date(Date.now() + 20 * 24 * 3600_000).toISOString().slice(0, 10)

    await b.goto(service.slug)
    await b.expectOpen(2)
    await b.shot(testInfo, 'r2-request')
    await page.locator('#book-date').fill(date)
    await page.locator('label').filter({ hasText: t.studio }).click()
    await page.getByRole('button', { name: t.morePeople }).click()
    await expect(page.locator('#book-people')).toHaveValue('2')
    await page.getByRole('button', { name: t.continue }).click()
    await b.expectOpen(3)
    await b.fillDetails({ name, phone: '+961 3 123 456' })
    await b.shot(testInfo, 'r3-details')
    await b.submit()
    await b.expectDone()
    await b.shot(testInfo, 'r4-done')

    const [booking, ...extra] = await api.bookingsNamed(name)
    expect(extra).toHaveLength(0)
    expect(booking.mode).toBe('request')
    expect(booking.status).toBe('pending')
    expect(booking.startTime ?? null, 'no start time').toBeNull()
    expect(booking.endTime ?? null, 'no end time').toBeNull()
    expect(booking.occupiedUntil ?? null).toBeNull()
    expect(booking.requestedDate && new Date(booking.requestedDate).getTime(), 'requested date = noon Beirut').toBe(
      beirutInstant(date, 12 * 60),
    )
    expect(booking.locationType).toBe('studio')
    expect(booking.peopleCount).toBe(2)

    const link = page.locator('a[href^="https://wa.me/"]').filter({ hasText: t.sendOnWhatsApp })
    const text = new URL((await link.getAttribute('href'))!).searchParams.get('text') ?? ''
    expect(text.startsWith(t.whatsappIntroRequest)).toBe(true)
    expect(text).toContain(`• ${t.summary.people}: 2`)
  })
}

test('request: once confirmed with a time, that time + break is blocked', async ({
  page,
  api,
  rules,
  slotServices,
  requestServices,
}) => {
  test.skip(requestServices.length === 0 || slotServices.length === 0, 'Needs a request and a slot service.')
  const slotService = slotServices[0]
  const b = new BookingPage(page, 'en')
  const t = dict.en.booking
  const name = testName('request confirm')

  // A time that is free on the site right now: the owner will confirm the request at it.
  await b.goto(slotService.slug)
  const free = await b.pickSlot({ day: 4, which: 'middle' })

  await b.goto(requestServices[0].slug)
  await page.locator('#book-date').fill(free.dateKey)
  await page.locator('label').filter({ hasText: t.studio }).click()
  await page.getByRole('button', { name: t.continue }).click()
  await b.fillDetails({ name, phone: '+961 3 123 456' })
  await b.submit()
  await b.expectDone()
  const [request] = await api.bookingsNamed(name)

  const refused = await api.updateBooking(request.id, { status: 'confirmed' })
  expect(refused.status, 'a request cannot be confirmed without times').toBe(400)

  const start = free.instant
  const end = start + slotService.duration * MINUTE
  const confirmed = await api.updateBooking(request.id, {
    status: 'confirmed',
    startTime: new Date(start).toISOString(),
    startTime_tz: TZ,
    endTime: new Date(end).toISOString(),
    endTime_tz: TZ,
  })
  expect(confirmed.status, `confirm with times: ${firstError(confirmed)}`).toBe(200)
  expect(new Date(confirmed.body.doc.occupiedUntil!).getTime()).toBe(end + rules.bufferMinutes * MINUTE)

  // On the site: nothing touching [start, end + break) for any slot service.
  const blockedUntil = end + rules.bufferMinutes * MINUTE
  for (const service of slotServices) {
    await b.goto(service.slug)
    const keys = await b.tileDates()
    const i = keys.indexOf(free.dateKey)
    if (!(await b.isTileOpen(i))) continue
    const clash = (await b.instantsOn(i, keys)).filter(
      (s) => !(s + (service.duration + rules.bufferMinutes) * MINUTE <= start || s >= blockedUntil),
    )
    expect(clash.map(hhmm), `${service.name}: starts touching ${hhmm(start)}–${hhmm(blockedUntil)}`).toEqual([])
  }
})

test('admin: may book outside working hours, never overlapping', async ({ page, api, rules, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const service = slotServices[0]
  const b = new BookingPage(page, 'en')
  await b.goto(service.slug)
  const { dateKey: day } = await b.pickSlot({ day: 5, which: 'first' })

  // A time on an open day that is outside every working range.
  const ranges = rangesOf(day, rules)
  const busy = await api.busy()
  const length = service.duration + rules.bufferMinutes
  const outside = [5 * 60, 6 * 60, 7 * 60, 21 * 60, 22 * 60]
    .map((m) => ({ m, start: beirutInstant(day, m)! }))
    .find(
      ({ m, start }) =>
        m + length <= 24 * 60 &&
        !ranges.some((r) => m < r.closes && m + service.duration > r.opens) &&
        !busy.some((x) => x.start < start + length * MINUTE && x.until > start),
    )
  test.skip(!outside, 'No free outside-hours time on that day.')
  const start = outside!.start
  const at = (ms: number) => ({ startTime: new Date(ms).toISOString(), startTime_tz: TZ })
  const booking = (label: string) => ({
    customerName: testName(label),
    phone: '+9613123456',
    service: service.id,
  })

  const early = await api.createBooking({ ...booking('admin outside hours'), ...at(start) })
  expect(early.status, `outside hours (${hhmm(start)}) by the admin: ${firstError(early)}`).toBe(201)

  const overlap = await api.createBooking({ ...booking('admin overlap'), ...at(start + 15 * MINUTE) })
  expect(overlap.status, 'overlapping booking refused').toBe(400)
  expect(firstError(overlap)).toMatch(/just taken/i)

  if (rules.bufferMinutes >= 2) {
    const inBreak = start + (service.duration + Math.floor(rules.bufferMinutes / 2)) * MINUTE
    const res = await api.createBooking({ ...booking('admin in break'), ...at(inBreak) })
    expect(res.status, `start inside the break (${hhmm(inBreak)}) refused`).toBe(400)
  }

  const afterBreak = start + length * MINUTE
  const clearOfOthers = !busy.some((x) => x.start < afterBreak + length * MINUTE && x.until > afterBreak)
  if (clearOfOthers) {
    const res = await api.createBooking({ ...booking('admin after break'), ...at(afterBreak) })
    expect(res.status, `right after the break (${hhmm(afterBreak)}) allowed: ${firstError(res)}`).toBe(201)
  }
})
