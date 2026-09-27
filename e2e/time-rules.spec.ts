import type { Service } from './helpers/api'
import {
  addDays,
  dateKey,
  expectedStarts,
  hhmm,
  HOUR,
  minuteOfDay,
  MINUTE,
  rangesOf,
  weekdayOf,
} from './helpers/beirut'
import { BookingPage, expect, test, testName } from './helpers/fixtures'

/**
 * 4. Break (buffer) after each booking, 5. time rules (window, notice, closed days, working
 * hours, start step) and 7. cancelling frees the time again.
 *
 * Everything is read from the database at run time (availability, existing bookings), and
 * checked against e2e/helpers/beirut.ts, written independently of the app's slot code.
 */

const describe = (t: number) => `${dateKey(t)} ${hhmm(t)}`

/** Longest and shortest slot services (one if they are the same). */
const extremes = (services: Service[]) => {
  const sorted = [...services].sort((a, b) => a.duration - b.duration)
  return sorted.length > 1 ? [sorted[0], sorted[sorted.length - 1]] : sorted
}

test('time rules: window, minimum notice, closed days, working hours and step', async ({
  page,
  api,
  rules,
  slotServices,
}) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  test.setTimeout(600_000)
  const b = new BookingPage(page, 'en')
  const problems: string[] = []

  for (const service of extremes(slotServices)) {
    const busy = await api.busy()
    const before = Date.now()
    await b.goto(service.slug)
    const after = Date.now()
    await b.waitForDays()

    const keys = await b.tileDates()
    const today = dateKey(before)
    expect(keys.length, 'one tile per day: today .. today + maxDaysAhead').toBe(rules.maxDaysAhead + 1)
    expect([today, dateKey(after)]).toContain(keys[0])
    expect(keys.at(-1), 'last day = today + maxDaysAhead').toBe(addDays(keys[0], rules.maxDaysAhead))

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const label = `${service.name} (${service.duration} min) ${key} ${weekdayOf(key)}`
      const ranges = rangesOf(key, rules)
      // Slots computed at page load lie between these two: early = superset, late = subset.
      const early = expectedStarts(key, rules, service.duration, before, busy)
      const late = expectedStarts(key, rules, service.duration, after, busy)

      if (!(await b.isTileOpen(i))) {
        if (late.length > 0) problems.push(`${label}: shown closed, but ${late.map(hhmm).join(' ')} should be free`)
        continue
      }
      if (ranges.length === 0) problems.push(`${label}: closed day (no hours or blocked date) is selectable`)

      const offered = await b.instantsOn(i, keys)
      for (const t of offered) {
        const m = minuteOfDay(t)
        const range = ranges.find((r) => r.opens <= m && m + service.duration <= r.closes)
        if (t < before + rules.minNoticeHours * HOUR) {
          problems.push(`${label}: ${hhmm(t)} is inside the ${rules.minNoticeHours}h minimum notice`)
        }
        if (!range) problems.push(`${label}: ${hhmm(t)} does not fit inside working hours (Beirut)`)
        else if ((m - range.opens) % rules.slotIntervalMinutes !== 0) {
          problems.push(`${label}: ${hhmm(t)} is off the ${rules.slotIntervalMinutes}-minute step`)
        }
        const until = t + (service.duration + rules.bufferMinutes) * MINUTE
        const clash = busy.find((x) => x.start < until && x.until > t)
        if (clash) problems.push(`${label}: ${hhmm(t)} overlaps a booking busy ${describe(clash.start)}–${hhmm(clash.until)}`)
        if (!early.includes(t)) problems.push(`${label}: ${hhmm(t)} offered but not expected`)
      }
      for (const t of late) {
        if (!offered.includes(t)) problems.push(`${label}: ${hhmm(t)} expected free but not offered`)
      }
    }
  }

  expect(problems, 'slot rule violations').toEqual([])
})

test('buffer: after a booking, offered starts leave duration + break free', async ({
  page,
  api,
  rules,
  slotServices,
}) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const [first, other] = [slotServices[0], slotServices.find((s) => s.duration !== slotServices[0].duration)]
  const b = new BookingPage(page, 'en')
  const name = testName('buffer')

  await b.goto(first.slug)
  const slot = await b.pickSlot({ day: 2, which: 'middle' })
  await b.fillDetails({ name, phone: '+961 3 123 456' })
  await b.submit()
  await b.expectDone()

  const S = slot.instant
  const busyUntil = S + (first.duration + rules.bufferMinutes) * MINUTE

  for (const service of [first, other].filter((s): s is Service => Boolean(s))) {
    await b.goto(service.slug)
    const keys = await b.tileDates()
    const index = keys.indexOf(slot.dateKey)
    if (!(await b.isTileOpen(index))) continue
    const offered = await b.instantsOn(index, keys)
    const label = `${service.name} (${service.duration} min, break ${rules.bufferMinutes})`

    const overlapping = offered.filter(
      (t) => !(t + (service.duration + rules.bufferMinutes) * MINUTE <= S || t >= busyUntil),
    )
    expect(overlapping.map(hhmm), `${label}: starts touching ${hhmm(S)}–${hhmm(busyUntil)}`).toEqual([])

    // The first start after the booking is exactly the first allowed one.
    const busy = await api.busy()
    const expectedNext = expectedStarts(slot.dateKey, rules, service.duration, Date.now(), busy).find((t) => t >= S)
    const offeredNext = offered.find((t) => t >= S)
    expect(offeredNext && hhmm(offeredNext), `${label}: next start after ${hhmm(S)}`).toBe(
      expectedNext && hhmm(expectedNext),
    )
    if (offeredNext) expect(offeredNext).toBeGreaterThanOrEqual(busyUntil)
  }
})

test('cancel: cancelling a booking frees its time again', async ({ page, api, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const service = slotServices[0]
  const b = new BookingPage(page, 'en')
  const name = testName('cancel')

  await b.goto(service.slug)
  const slot = await b.pickSlot({ day: 3, which: 'first' })
  await b.fillDetails({ name, phone: '+961 3 123 456' })
  await b.submit()
  await b.expectDone()

  const timesOnDay = async () => {
    await b.goto(service.slug)
    const keys = await b.tileDates()
    const i = keys.indexOf(slot.dateKey)
    return (await b.isTileOpen(i)) ? (await b.instantsOn(i, keys)).map(hhmm) : []
  }
  expect(await timesOnDay(), 'booked time is taken').not.toContain(slot.time)

  const [booking] = await api.bookingsNamed(name)
  const res = await api.updateBooking(booking.id, { status: 'cancelled' })
  expect(res.status, 'admin can cancel').toBe(200)

  expect(await timesOnDay(), 'cancelled time is free again').toContain(slot.time)
})
