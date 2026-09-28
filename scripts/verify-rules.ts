/**
 * Proves the booking and order rules against the real database, then deletes everything
 * it created (also when a check fails). Run with:  npm run verify:rules
 *
 * Public-website calls are made WITHOUT a user (full rules); owner actions pass a
 * temporary admin user (exempt from the time rules, never from no-overlap).
 */
import { TZDate } from '@date-fns/tz'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { createPublicBooking, loadFreeSlots } from '../src/lib/booking'
import { isBookingOverlapError } from '../src/lib/bookingErrors'
import { loadCartProducts } from '../src/lib/cartProducts'
import { getClientIp } from '../src/lib/clientIp'
import { placeOrder } from '../src/lib/order'
import { isOrderNumber } from '../src/lib/orderNumber'
import { consumeRateLimit, hashVisitorKey } from '../src/lib/rateLimit'
import { businessTime, freeSlots, type BookingRules, type DaySlots } from '../src/lib/slots'
import { BUSINESS_TIME_ZONE, businessDateKeyFromToday, inBusinessZone } from '../src/lib/time'
import type { Availability, Order, SiteSetting, User } from '../src/payload-types'

/**
 * Payload's create types expect every required field, including the ones the server
 * computes (mode, stock, total). These calls send only what a client would send,
 * on purpose, so their data is cast.
 */
type ClientData = never

type Result = { check: string; expected: 'ok' | 'fail'; passed: boolean; detail: string }
const results: Result[] = []

const reason = (error: unknown): string => {
  const e = error as { data?: { errors?: { message?: string }[] }; message?: string }
  if (e.data?.errors?.[0]?.message) return e.data.errors[0].message
  // Drizzle wraps the Postgres error: show its SQLSTATE and constraint instead of the query.
  let cause: unknown = error
  while (cause && typeof cause === 'object') {
    const c = cause as { code?: string; constraint?: string; cause?: unknown }
    if (c.code) return `Postgres ${c.code}${c.constraint ? ` (${c.constraint})` : ''}`
    cause = c.cause
  }
  return e.message ?? String(error)
}

const expectOk = async <T>(
  check: string,
  run: () => Promise<T>,
  describe?: (value: T) => string,
) => {
  try {
    const value = await run()
    results.push({
      check,
      expected: 'ok',
      passed: true,
      detail: describe ? describe(value) : 'saved',
    })
    return value
  } catch (error) {
    results.push({ check, expected: 'ok', passed: false, detail: reason(error) })
    return undefined
  }
}

const expectFail = async (
  check: string,
  run: () => Promise<unknown>,
  accept?: (error: unknown) => boolean,
) => {
  try {
    await run()
    results.push({
      check,
      expected: 'fail',
      passed: false,
      detail: 'was saved, but must be refused',
    })
  } catch (error) {
    const passed = accept ? accept(error) : true
    results.push({ check, expected: 'fail', passed, detail: reason(error) })
  }
}

const expectTrue = (check: string, condition: boolean, detail: string) =>
  results.push({ check, expected: 'ok', passed: condition, detail })

/** Beirut wall-clock time on a Beirut date key -> UTC ISO string. */
const beirut = (dateKey: string, hours: number, minutes = 0): string => {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(
    new TZDate(y, m - 1, d, hours, minutes, 0, BUSINESS_TIME_ZONE).getTime(),
  ).toISOString()
}

const stockOf = async (payload: Payload, id: number) =>
  (await payload.findByID({ collection: 'products', id, depth: 0 })).stock

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** Free times on one date as Beirut "HH:mm" strings. */
const timesOn = (days: DaySlots[] | null, date: string): string[] =>
  (days?.find((d) => d.date === date)?.times ?? []).map((t) => {
    const z = inBusinessZone(t)
    return hhmm(z.getHours() * 60 + z.getMinutes())
  })

/** "10:00".."13:00" every 30 minutes, both ends included. */
const everyHalfHour = (from: string, to: string): string[] => {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  const out: string[] = []
  for (let m = toMin(from); m <= toMin(to); m += 30) out.push(hhmm(m))
  return out
}

const same = (a: string[], b: string[]) => a.join(',') === b.join(',')

/**
 * The slot calculation on its own, with a fixed "now", so daylight-saving dates are exact.
 * Now = Monday 19 Oct 2026, 09:00 Beirut. Beirut leaves summer time on Sunday 25 Oct 2026 at
 * 00:00 (UTC+3 -> UTC+2) and starts it on Sunday 28 Mar 2027 at 00:00 (00:00–01:00 skipped).
 */
const slotCalculationChecks = () => {
  const now = new Date(beirut('2026-10-19', 9))
  const rules: BookingRules = {
    weeklyHours: [
      { day: 'mon', opens: '10:00', closes: '20:00' },
      { day: 'tue', opens: '10:00', closes: '14:00' },
      { day: 'tue', opens: '16:00', closes: '20:00' },
      { day: 'wed', opens: '10:00', closes: '20:00' },
      { day: 'thu', opens: '10:00', closes: '20:00' },
      { day: 'sun', opens: '10:00', closes: '14:00' },
    ],
    blockedDates: [{ from: beirut('2026-10-22', 12), from_tz: BUSINESS_TIME_ZONE }],
    slotIntervalMinutes: 30,
    bufferMinutes: 15,
    minNoticeHours: 24,
    maxDaysAhead: 14,
  }
  const slots = (overrides: Partial<Parameters<typeof freeSlots>[0]> = {}) =>
    freeSlots({ rules, busy: [], durationMinutes: 60, now, ...overrides })
  const base = slots()

  const tue = timesOn(base, '2026-10-20')
  expectTrue(
    'Slots · two ranges with a break between (Tue 10–14 and 16–20, 60 min service)',
    same(tue, [...everyHalfHour('10:00', '13:00'), ...everyHalfHour('16:00', '19:00')]),
    tue.join(' '),
  )

  expectTrue(
    'Slots · minimum notice 24h: nothing today (Mon 19)',
    timesOn(base, '2026-10-19').length === 0,
    `Mon: ${timesOn(base, '2026-10-19').join(' ') || 'none'}`,
  )
  const later = timesOn(slots({ now: new Date(beirut('2026-10-19', 10, 10)) }), '2026-10-20')
  expectTrue(
    'Slots · minimum notice: at 10:10 on Mon, Tue starts at 10:30',
    later[0] === '10:30',
    `Tue first: ${later[0]}`,
  )

  const withBooking = timesOn(
    slots({ busy: [{ start: beirut('2026-10-20', 11), until: beirut('2026-10-20', 12, 15) }] }),
    '2026-10-20',
  ).filter((t) => t < '14:00')
  expectTrue(
    'Slots · buffer: a booking 11:00–12:00 (+15 min break) leaves only 12:30 and 13:00 before 14:00',
    same(withBooking, ['12:30', '13:00']),
    withBooking.join(' '),
  )

  expectTrue(
    'Slots · blocked date: Thu 22 Oct closed, Wed 21 open',
    timesOn(base, '2026-10-22').length === 0 && timesOn(base, '2026-10-21').length > 0,
    `Thu ${timesOn(base, '2026-10-22').length} times, Wed ${timesOn(base, '2026-10-21').length}`,
  )

  expectTrue(
    'Slots · days-ahead 14: 15 dates, last 2 Nov; a day with no hours (Sat) is empty',
    base.length === 15 &&
      base.at(-1)?.date === '2026-11-02' &&
      timesOn(base, '2026-10-24').length === 0,
    `${base.length} dates, last ${base.at(-1)?.date}, Sat ${timesOn(base, '2026-10-24').length}`,
  )

  const firstUtc = (days: DaySlots[], date: string) => days.find((d) => d.date === date)?.times[0]
  expectTrue(
    'Slots · DST end: 10:00 Beirut is 07:00Z on Tue 20 Oct, 08:00Z on Tue 27 Oct',
    firstUtc(base, '2026-10-20') === '2026-10-20T07:00:00.000Z' &&
      firstUtc(base, '2026-10-27') === '2026-10-27T08:00:00.000Z',
    `${firstUtc(base, '2026-10-20')} / ${firstUtc(base, '2026-10-27')}`,
  )
  expectTrue(
    'Slots · on the DST-end day (Sun 25 Oct): 10:00–13:00 local, 10:00 = 08:00Z',
    same(timesOn(base, '2026-10-25'), everyHalfHour('10:00', '13:00')) &&
      firstUtc(base, '2026-10-25') === '2026-10-25T08:00:00.000Z',
    `${timesOn(base, '2026-10-25').join(' ')} / ${firstUtc(base, '2026-10-25')}`,
  )

  const spring = freeSlots({
    rules: { ...rules, weeklyHours: [{ day: 'sun', opens: '00:00', closes: '03:00' }] },
    busy: [],
    durationMinutes: 60,
    now: new Date(beirut('2027-03-20', 12)),
  })
  expectTrue(
    'Slots · DST start (Sun 28 Mar 2027): 00:00 and 00:30 do not exist; 01:00 = 22:00Z the day before',
    businessTime('2027-03-28', 0) === null &&
      same(timesOn(spring, '2027-03-28'), ['01:00', '01:30', '02:00']) &&
      firstUtc(spring, '2027-03-28') === '2027-03-27T22:00:00.000Z',
    `${timesOn(spring, '2027-03-28').join(' ')} / ${firstUtc(spring, '2027-03-28')}`,
  )
}

const main = async () => {
  const payload = await getPayload({ config })
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const created = {
    bookings: [] as number[],
    orders: [] as number[],
    products: [] as number[],
    services: [] as number[],
  }
  let admin: User | undefined
  const originalAvailability: Availability = await payload.findGlobal({
    slug: 'availability',
    depth: 0,
  })
  const originalSettings: SiteSetting = await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
  })
  // A documentation-only address (TEST-NET-1, RFC 5737) for the checkout's rate limit.
  const checkoutIp = '192.0.2.77'

  try {
    slotCalculationChecks()

    // ── Setup ──────────────────────────────────────────────────────────────
    await payload.updateGlobal({
      slug: 'availability',
      data: {
        weeklyHours: (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => ({
          day,
          opens: '09:00',
          closes: '20:00',
        })),
        blockedDates: [],
        slotIntervalMinutes: 30,
        bufferMinutes: 30,
        minNoticeHours: 24,
        maxDaysAhead: 60,
      },
    })
    admin = await payload.create({
      collection: 'users',
      data: {
        email: `verify-${Date.now()}@example.test`,
        password: `Tmp-${crypto.randomUUID()}`,
        name: 'TEST',
      },
    })
    const slotService = await payload.create({
      collection: 'services',
      data: {
        name: 'TEST slot service',
        slug: `test-slot-${Date.now()}`,
        category: 'makeup',
        price: { amount: 5000, currency: 'USD' },
        duration: 60,
        bookingMode: 'slot',
      },
    })
    const requestService = await payload.create({
      collection: 'services',
      data: {
        name: 'TEST bridal request',
        slug: `test-request-${Date.now()}`,
        category: 'makeup',
        price: { amount: 30000, currency: 'USD' },
        duration: 240,
        bookingMode: 'request',
      },
    })
    created.services.push(slotService.id, requestService.id)

    const day = businessDateKeyFromToday(3)
    const customer = { customerName: 'TEST customer', phone: '+961 3 000 000' }
    const bookSlot = (hours: number, minutes = 0) =>
      payload.create({
        collection: 'bookings',
        data: {
          ...customer,
          service: slotService.id,
          startTime: beirut(day, hours, minutes),
        } as ClientData,
      })

    // ── 1. Two overlapping slot bookings ───────────────────────────────────
    const a = await expectOk(
      'Slot booking A, 10:00–11:00 (public)',
      () => bookSlot(10),
      (b) => `status ${b.status}, ends ${b.endTime}`,
    )
    if (a) created.bookings.push(a.id)
    await expectFail('Slot booking B at 10:30 overlaps A', () => bookSlot(10, 30))

    // ── 2. Inside A's 30-minute break ──────────────────────────────────────
    await expectFail("Slot booking at 11:00, inside A's break (until 11:30)", () => bookSlot(11))
    const d = await expectOk('Control: slot booking at 11:30, right after the break', () =>
      bookSlot(11, 30),
    )
    if (d) created.bookings.push(d.id)

    // ── 3. Two request bookings with no times on the same date ─────────────
    const requestDate = beirut(businessDateKeyFromToday(10), 12)
    const makeRequest = () =>
      payload.create({
        collection: 'bookings',
        data: {
          ...customer,
          service: requestService.id,
          requestedDate: requestDate,
          locationType: 'onLocation',
          locationAddress: 'TEST address',
          peopleCount: 3,
          wantsTrial: true,
          startTime: beirut(day, 10), // must be ignored: requests have no time on creation
        } as ClientData,
      })
    const r1 = await expectOk(
      'Request booking R1, no times',
      makeRequest,
      (b) => `status ${b.status}, startTime ${b.startTime ?? 'null'}`,
    )
    const r2 = await expectOk(
      'Request booking R2, same date, no times',
      makeRequest,
      (b) => `status ${b.status}, startTime ${b.startTime ?? 'null'}`,
    )
    if (r1) created.bookings.push(r1.id)
    if (r2) created.bookings.push(r2.id)

    // ── 4. Confirming a request without times ──────────────────────────────
    if (r1 && r2) {
      await expectFail('Owner confirms R1 without times', () =>
        payload.update({
          collection: 'bookings',
          id: r1.id,
          user: admin,
          data: { status: 'confirmed' },
        }),
      )
      await expectFail('Owner sets R1 to 09:30–10:30, overlapping A', () =>
        payload.update({
          collection: 'bookings',
          id: r1.id,
          user: admin,
          data: {
            status: 'confirmed',
            startTime: beirut(day, 9, 30),
            endTime: beirut(day, 10, 30),
          },
        }),
      )
      await expectOk(
        'Owner confirms R1 at 05:00–07:00 (outside working hours: admin exempt)',
        () =>
          payload.update({
            collection: 'bookings',
            id: r1.id,
            user: admin,
            data: { status: 'confirmed', startTime: beirut(day, 5), endTime: beirut(day, 7) },
          }),
        (b) => `status ${b.status}, blocks until ${b.occupiedUntil}`,
      )
      await expectFail("Owner sets R2 to 07:00–08:00, inside R1's break", () =>
        payload.update({
          collection: 'bookings',
          id: r2.id,
          user: admin,
          data: { startTime: beirut(day, 7), endTime: beirut(day, 8) },
        }),
      )
      await expectFail('Public (no user) slot booking at 05:30 is outside working hours', () =>
        bookSlot(5, 30),
      )
      await expectFail('Changing R2 to the slot service (different booking type)', () =>
        payload.update({
          collection: 'bookings',
          id: r2.id,
          user: admin,
          data: { service: slotService.id },
        }),
      )
    }

    // ── 5. The database itself refuses an overlap that skips the hooks ─────
    await expectFail(
      'Raw SQL insert overlapping A, bypassing Payload (exclusion constraint)',
      () =>
        db.execute(sql`
          INSERT INTO bookings (customer_name, phone, service_id, mode, start_time, end_time, occupied_until, status)
          VALUES ('TEST raw', '+9613000000', ${slotService.id}, 'slot',
                  ${beirut(day, 10, 15)}, ${beirut(day, 11, 15)}, ${beirut(day, 11, 45)}, 'pending')`),
      (error) => isBookingOverlapError(error),
    )

    // ── 6. The booking page's server code against the database ─────────────
    // `day` now has A (10:00–11:00, break to 11:30), D (11:30–12:30, break to 13:00) and
    // R1 (05:00–07:00). Hours 09:00–20:00, 60-minute service, 30-minute break.
    const pageSlots = await loadFreeSlots(payload, slotService.id)
    const onDay = timesOn(pageSlots, day)
    expectTrue(
      'Page slots · first free time is 13:00 (09:00 would run into A with its break)',
      onDay[0] === '13:00' && !onDay.includes('10:00') && !onDay.includes('11:00'),
      onDay.join(' '),
    )
    const slotsJson = JSON.stringify(pageSlots)
    expectTrue(
      'Page slots · the response holds only dates and times, no customer data',
      !slotsJson.includes('TEST') &&
        !slotsJson.includes('+961') &&
        (pageSlots ?? []).every((d) => Object.keys(d).join() === 'date,times'),
      `${slotsJson.length} bytes, keys: ${Object.keys(pageSlots?.[0] ?? {}).join()}`,
    )
    expectTrue(
      'Page slots · a request service gets no slot list',
      (await loadFreeSlots(payload, requestService.id)) === null,
      'null',
    )

    const form = { serviceId: slotService.id, name: 'TEST public', phone: '+961 3 000 000' }
    const taken = await createPublicBooking(payload, { ...form, startTime: beirut(day, 10) })
    expectTrue(
      'Page submit · 10:00 is taken → slotTaken',
      !taken.ok && taken.reason === 'slotTaken',
      JSON.stringify(taken),
    )
    const badPhone = await createPublicBooking(payload, {
      ...form,
      phone: '03 123',
      startTime: beirut(day, 13),
    })
    expectTrue(
      'Page submit · invalid phone → field error, nothing saved',
      !badPhone.ok && badPhone.reason === 'invalid' && badPhone.fields.includes('phone'),
      JSON.stringify(badPhone),
    )
    const booked = await createPublicBooking(payload, { ...form, startTime: beirut(day, 13) })
    const afterBooking = timesOn(await loadFreeSlots(payload, slotService.id), day)
    expectTrue(
      'Page submit · 13:00 saved; then 13:00 and 13:30 (its break) disappear from the list',
      booked.ok && !afterBooking.includes('13:00') && !afterBooking.includes('13:30'),
      `${JSON.stringify(booked)}; now starts ${afterBooking.slice(0, 3).join(' ')}…`,
    )
    const lastDay = [...(pageSlots ?? [])].reverse().find((d) => d.times.length > 0)
    const edge = lastDay
      ? await createPublicBooking(payload, { ...form, startTime: lastDay.times.at(-1) })
      : undefined
    expectTrue(
      "Page submit · the window's last offered slot (today + 60) is accepted by the hook",
      Boolean(edge?.ok) && lastDay?.date === businessDateKeyFromToday(60),
      `${lastDay?.date} ${timesOn(pageSlots, lastDay?.date ?? '').at(-1)}: ${JSON.stringify(edge)}`,
    )
    const noAddress = await createPublicBooking(payload, {
      serviceId: requestService.id,
      name: 'TEST public request',
      phone: '+961 71 000 000',
      requestedDate: businessDateKeyFromToday(90),
      locationType: 'onLocation',
      locationAddress: '',
      peopleCount: 2,
    })
    expectTrue(
      'Page submit · on-location request without an address → field error',
      !noAddress.ok &&
        noAddress.reason === 'invalid' &&
        noAddress.fields.includes('locationAddress'),
      JSON.stringify(noAddress),
    )

    const rateKey = crypto.randomUUID()
    const hits: boolean[] = []
    for (let i = 0; i < 6; i++) {
      hits.push(
        await consumeRateLimit(payload, {
          bucket: 'verify',
          key: rateKey,
          limit: 5,
          windowSeconds: 600,
        }),
      )
    }
    expectTrue(
      'Rate limit · 5 requests per 10 minutes, the 6th is refused',
      same(hits.map(String), ['true', 'true', 'true', 'true', 'true', 'false']),
      hits.join(' '),
    )

    // Which address the rate limits count. A visitor can send any x-forwarded-for she likes.
    const spoofed = new Headers({
      'x-forwarded-for': '203.0.113.9',
      'x-host-client-ip': '198.51.100.7',
    })
    const quiet = () => {}
    const prodIp = getClientIp(
      spoofed,
      { NODE_ENV: 'production', TRUSTED_IP_HEADER: 'x-host-client-ip' },
      quiet,
    )
    expectTrue(
      'Client IP · production reads TRUSTED_IP_HEADER and ignores x-forwarded-for',
      prodIp === '198.51.100.7',
      String(prodIp),
    )
    const unset = getClientIp(spoofed, { NODE_ENV: 'production' }, quiet)
    const missing = getClientIp(
      new Headers({ 'x-forwarded-for': '203.0.113.9' }),
      { NODE_ENV: 'production', TRUSTED_IP_HEADER: 'x-host-client-ip' },
      quiet,
    )
    expectTrue(
      'Client IP · production without the trusted header → none (site-wide limit), never x-forwarded-for',
      unset === null && missing === null,
      `unset: ${unset}, header missing: ${missing}`,
    )
    const devIp = getClientIp(spoofed, { NODE_ENV: 'development' })
    expectTrue(
      'Client IP · development takes the first x-forwarded-for (the e2e suite relies on it)',
      devIp === '203.0.113.9',
      String(devIp),
    )

    // A local number as customers type it is saved in E.164.
    const localName = 'TEST public local phone'
    const local = await createPublicBooking(payload, {
      serviceId: requestService.id,
      name: localName,
      phone: '٠٣ ١٢٣ ٤٥٦',
      requestedDate: businessDateKeyFromToday(91),
      locationType: 'studio',
      peopleCount: 1,
    })
    const [savedLocal] = (
      await payload.find({
        collection: 'bookings',
        where: { customerName: { equals: localName } },
        depth: 0,
        limit: 1,
      })
    ).docs
    expectTrue(
      'Page submit · "٠٣ ١٢٣ ٤٥٦" (Arabic digits, no country code) saved as +9613123456',
      local.ok && savedLocal?.phone === '+9613123456',
      `${JSON.stringify(local)}; saved ${savedLocal?.phone}`,
    )

    // ── 7. Confirming an order with more quantity than stock ───────────────
    const p = await payload.create({
      collection: 'products',
      data: {
        name: 'TEST mask',
        price: { amount: 1250, currency: 'USD' },
        type: 'brand',
        stockAdjustment: 2,
      } as ClientData,
    })
    created.products.push(p.id)
    const order = await expectOk(
      'Public order, 2 × TEST mask, client sends a fake price',
      () =>
        payload.create({
          collection: 'orders',
          data: {
            ...customer,
            fulfillment: 'pickup',
            status: 'confirmed', // must be forced back to "new"
            items: [{ product: p.id, quantity: 2, unitPrice: { amount: 1, currency: 'USD' } }],
            total: { amount: 1, currency: 'USD' },
          },
        }),
      (o) => `status ${o.status}, total ${o.total?.amount} cents (2 × 1250)`,
    )
    if (order) created.orders.push(order.id)
    await expectOk(
      'Owner adjusts TEST mask stock by -1',
      () =>
        payload.update({
          collection: 'products',
          id: p.id,
          user: admin,
          data: { stockAdjustment: -1 },
        }),
      (prod) => `stock now ${prod.stock}`,
    )
    if (order) {
      await expectFail('Confirm the order (needs 2, only 1 in stock)', () =>
        payload.update({
          collection: 'orders',
          id: order.id,
          user: admin,
          data: { status: 'confirmed' },
        }),
      )
      const stock = await stockOf(payload, p.id)
      expectTrue(
        '…stock unchanged after the refused confirmation',
        stock === 1,
        `stock ${stock} (expected 1)`,
      )
    }

    // ── 8. A delivered order changed to cancelled ──────────────────────────
    const q = await payload.create({
      collection: 'products',
      data: {
        name: 'TEST serum',
        price: { amount: 3000, currency: 'USD' },
        type: 'brand',
        stockAdjustment: 5,
      } as ClientData,
    })
    created.products.push(q.id)
    const delivered = await payload.create({
      collection: 'orders',
      data: {
        ...customer,
        fulfillment: 'delivery',
        street: 'TEST street',
        area: 'TEST area',
        items: [{ product: q.id, quantity: 1 }],
      } as ClientData,
    })
    created.orders.push(delivered.id)
    await payload.update({
      collection: 'orders',
      id: delivered.id,
      user: admin,
      data: { status: 'confirmed' },
    })
    await payload.update({
      collection: 'orders',
      id: delivered.id,
      user: admin,
      data: { status: 'delivered' },
    })
    const beforeCancel = await stockOf(payload, q.id)
    await expectFail('Change the delivered order to cancelled', () =>
      payload.update({
        collection: 'orders',
        id: delivered.id,
        user: admin,
        data: { status: 'cancelled' },
      }),
    )
    const afterCancel = await stockOf(payload, q.id)
    const status = (await payload.findByID({ collection: 'orders', id: delivered.id, depth: 0 }))
      .status
    expectTrue(
      '…still delivered, stock unchanged',
      status === 'delivered' && afterCancel === beforeCancel && beforeCancel === 4,
      `status ${status}, stock ${afterCancel} (5 − 1 confirmed = 4)`,
    )

    // ── 9. The cart check never names a product that isn't on sale ─────────
    const hiddenProducts = await Promise.all(
      [
        { name: 'TEST hidden draft', type: 'brand', active: false },
        { name: 'TEST hidden scarf', type: 'fashion', active: true },
        { name: 'TEST shown balm', type: 'brand', active: true },
      ].map((p) =>
        payload.create({
          collection: 'products',
          data: {
            ...p,
            price: { amount: 1000, currency: 'USD' },
            stockAdjustment: 3,
          } as ClientData,
        }),
      ),
    )
    created.products.push(...hiddenProducts.map((p) => p.id))
    const [draft, scarf, balm] = hiddenProducts
    const checks = await loadCartProducts(payload, [draft.id, scarf.id, balm.id], 'en')
    const hidden = checks.filter((c) => c.id !== balm.id)
    expectTrue(
      'Cart check · switched-off and fashion products return only { id, available: false }',
      hidden.length === 2 &&
        hidden.every((c) => Object.keys(c).sort().join() === 'available,id' && !c.available) &&
        !JSON.stringify(checks).includes('TEST hidden'),
      JSON.stringify(hidden),
    )
    expectTrue(
      'Cart check · a product on sale comes back with its name, price and stock',
      checks.some((c) => c.id === balm.id && c.available && c.name === 'TEST shown balm'),
      JSON.stringify(checks.find((c) => c.id === balm.id)),
    )

    // ── 10. Shop rules (public orders, stock, fee, totals, checkout) ───────
    const newProduct = async (name: string, amount: number, stock: number, extra = {}) => {
      const doc = await payload.create({
        collection: 'products',
        data: {
          name,
          price: { amount, currency: 'USD' },
          type: 'brand',
          stockAdjustment: stock,
          ...extra,
        } as ClientData,
      })
      created.products.push(doc.id)
      return doc
    }
    const keep = (o: Order) => {
      created.orders.push(o.id)
      return o
    }
    const publicOrder = (items: { product: number; quantity: number }[], extra = {}) =>
      payload
        .create({
          collection: 'orders',
          data: { ...customer, fulfillment: 'pickup', items, ...extra } as ClientData,
        })
        .then(keep)
    const ownerOrder = (items: { product: number; quantity: number }[]) =>
      payload
        .create({
          collection: 'orders',
          user: admin,
          data: { ...customer, fulfillment: 'pickup', items } as ClientData,
        })
        .then(keep)
    const setStatus = (id: number, status: Order['status']) =>
      payload.update({ collection: 'orders', id, user: admin, data: { status } })

    const shopScarf = await newProduct('TEST shop scarf', 4000, 3, { type: 'fashion' })
    await expectFail('Public order with a fashion item (not sold on the site yet)', () =>
      publicOrder([{ product: shopScarf.id, quantity: 1 }]),
    )
    await expectOk(
      'Owner order with a fashion item (allowed in the admin)',
      () => ownerOrder([{ product: shopScarf.id, quantity: 1 }]),
      (o) => `status ${o.status}`,
    )
    const switchedOff = await newProduct('TEST shop off', 1500, 3, { active: false })
    await expectFail('Public order with a switched-off product', () =>
      publicOrder([{ product: switchedOff.id, quantity: 1 }]),
    )
    const soldOut = await newProduct('TEST shop sold out', 1500, 0)
    await expectFail('Public order with an out-of-stock product', () =>
      publicOrder([{ product: soldOut.id, quantity: 1 }]),
    )
    const clay = await newProduct('TEST shop clay', 1800, 3)
    await expectFail('Public order: the same product on two lines, 2 + 2 with 3 in stock', () =>
      publicOrder([
        { product: clay.id, quantity: 2 },
        { product: clay.id, quantity: 2 },
      ]),
    )

    // Delivery fee: copied from Site settings for delivery orders, never for pickup.
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { shop: { deliveryFee: { amount: 300, currency: 'USD' } } },
    })
    const withFee = await expectOk(
      'Delivery order with a $3 fee set, client sends its own number and fee',
      () =>
        publicOrder([{ product: clay.id, quantity: 2 }], {
          fulfillment: 'delivery',
          area: 'TEST area',
          street: 'TEST street',
          orderNumber: 'AAAAAA', // must be ignored
          deliveryFee: { amount: 0, currency: 'USD' }, // must be replaced
        }),
      (o) => `fee ${o.deliveryFee?.amount}, total ${o.total?.amount}, number ${o.orderNumber}`,
    )
    if (withFee) {
      expectTrue(
        '…fee 300, total 3900 (2 × 1800 + 300), a fresh 6-character order number',
        withFee.deliveryFee?.amount === 300 &&
          withFee.total?.amount === 3900 &&
          withFee.orderNumber !== 'AAAAAA' &&
          isOrderNumber(withFee.orderNumber ?? ''),
        `fee ${withFee.deliveryFee?.amount}, total ${withFee.total?.amount}, number ${withFee.orderNumber}`,
      )
    }
    const pickup = await publicOrder([{ product: clay.id, quantity: 1 }])
    expectTrue(
      'Pickup order: no delivery fee, total = lines only',
      pickup.deliveryFee?.amount == null && pickup.total?.amount === 1800,
      `fee ${pickup.deliveryFee?.amount}, total ${pickup.total?.amount}`,
    )
    await expectFail('Delivery order without an area and street', () =>
      publicOrder([{ product: clay.id, quantity: 1 }], { fulfillment: 'delivery' }),
    )

    // The order lines are frozen once saved.
    await payload.update({
      collection: 'orders',
      id: pickup.id,
      user: admin,
      data: {
        items: [
          {
            product: clay.id,
            quantity: 3,
            productName: 'changed',
            unitPrice: { amount: 1, currency: 'USD' },
          },
        ],
      } as ClientData,
    })
    const frozen = await payload.findByID({ collection: 'orders', id: pickup.id, depth: 0 })
    expectTrue(
      'Owner edits an order line: lines and total stay as ordered',
      frozen.items.length === 1 &&
        frozen.items[0].quantity === 1 &&
        frozen.items[0].productName === 'TEST shop clay' &&
        frozen.total?.amount === 1800,
      `${frozen.items[0].quantity} × ${frozen.items[0].productName}, total ${frozen.total?.amount}`,
    )

    // Stock round trip: confirm takes it, cancel puts it back.
    if (withFee) {
      await expectOk('Confirm the delivery order (2 of 3 clay)', () =>
        setStatus(withFee.id, 'confirmed'),
      )
      const afterConfirm = await stockOf(payload, clay.id)
      await expectOk('Cancel the confirmed order', () => setStatus(withFee.id, 'cancelled'))
      const afterCancel = await stockOf(payload, clay.id)
      expectTrue(
        '…stock 3 → 1 on confirm, back to 3 on cancel',
        afterConfirm === 1 && afterCancel === 3,
        `after confirm ${afterConfirm}, after cancel ${afterCancel}`,
      )
    }

    // The same product on two lines is checked as one total when confirming.
    const twoLines = await ownerOrder([
      { product: clay.id, quantity: 1 },
      { product: clay.id, quantity: 1 },
    ])
    await payload.update({
      collection: 'products',
      id: clay.id,
      user: admin,
      data: { stockAdjustment: -2 },
    })
    await expectFail('Confirm 1 + 1 of the same product with 1 in stock', () =>
      setStatus(twoLines.id, 'confirmed'),
    )
    const refusal = results.at(-1)?.detail ?? ''
    const lastOne = await stockOf(payload, clay.id)
    expectTrue(
      '…the error names the product, what the order needs and what is left; stock unchanged',
      refusal.includes('"TEST shop clay"') &&
        refusal.includes('needs 2') &&
        refusal.includes('only 1 is left') &&
        lastOne === 1,
      `stock ${lastOne}`,
    )

    // Two orders race for the last item: exactly one is confirmed, stock never below 0.
    const racerA = await publicOrder([{ product: clay.id, quantity: 1 }])
    const racerB = await publicOrder([{ product: clay.id, quantity: 1 }])
    const race = await Promise.allSettled([
      setStatus(racerA.id, 'confirmed'),
      setStatus(racerB.id, 'confirmed'),
    ])
    const raceStock = await stockOf(payload, clay.id)
    expectTrue(
      'Two orders confirmed at the same moment for the last item: one wins, stock 0',
      race.filter((r) => r.status === 'fulfilled').length === 1 && raceStock === 0,
      `${race.map((r) => r.status).join(' / ')}, stock ${raceStock}`,
    )

    // Customer data stays private: no reading orders without a login.
    await expectFail('Read orders without a login (public API rules)', () =>
      payload.find({ collection: 'orders', overrideAccess: false, depth: 0 }),
    )

    // The real checkout code: prices from the database, a second send finds the first order.
    const balmForCheckout = await newProduct('TEST shop balm', 2500, 4)
    const checkoutHeaders = {
      get: (name: string) => (name.toLowerCase() === 'x-forwarded-for' ? checkoutIp : null),
    }
    const checkout = {
      checkoutId: `verify-${crypto.randomUUID()}`,
      locale: 'en',
      name: 'TEST checkout',
      phone: '03 123 456',
      fulfillment: 'pickup',
      items: [{ productId: balmForCheckout.id, quantity: 2, priceCents: 1 }],
    }
    const placed = await placeOrder(payload, checkout, checkoutHeaders)
    const again = await placeOrder(payload, checkout, checkoutHeaders)
    const saved = await payload.find({
      collection: 'orders',
      depth: 0,
      where: { checkoutId: { equals: checkout.checkoutId } },
    })
    created.orders.push(...saved.docs.map((o) => o.id))
    expectTrue(
      'Checkout: total from the database (2 × 2500), status new, phone in E.164',
      placed.ok &&
        placed.order.totalCents === 5000 &&
        saved.docs[0]?.status === 'new' &&
        saved.docs[0]?.phone === '+9613123456',
      placed.ok ? `total ${placed.order.totalCents}, ${saved.docs[0]?.status}` : placed.reason,
    )
    expectTrue(
      'Checkout sent twice (double tap): one order, the same number',
      again.ok && placed.ok && again.order.number === placed.order.number && saved.totalDocs === 1,
      `${saved.totalDocs} order(s)`,
    )
    const fashionCheckout = await placeOrder(
      payload,
      {
        ...checkout,
        checkoutId: `verify-${crypto.randomUUID()}`,
        items: [{ productId: shopScarf.id, quantity: 1 }],
      },
      checkoutHeaders,
    )
    expectTrue(
      'Checkout with a fashion item: refused as "cart changed", nothing saved',
      !fashionCheckout.ok && fashionCheckout.reason === 'cartChanged',
      JSON.stringify(fashionCheckout),
    )
  } finally {
    // ── Cleanup: delete everything this script created ─────────────────────
    // Each step runs even if an earlier one fails, and the owner's settings come back first.
    const step = async (name: string, run: () => Promise<unknown>) => {
      try {
        await run()
      } catch (error) {
        console.error(`Cleanup step failed: ${name}: ${reason(error)}`)
      }
    }
    const { id: _id, createdAt: _c, updatedAt: _u, ...restore } = originalAvailability
    await step('availability', () => payload.updateGlobal({ slug: 'availability', data: restore }))
    await step('delivery fee', () =>
      payload.updateGlobal({
        slug: 'site-settings',
        data: { shop: { deliveryFee: originalSettings.shop?.deliveryFee } },
      }),
    )
    for (const id of created.orders) {
      await step(`order ${id}`, () => payload.delete({ collection: 'orders', id }))
    }
    // Every test booking, including the ones the booking-page code created.
    await step('bookings', () =>
      db.execute(sql`DELETE FROM bookings WHERE customer_name LIKE 'TEST%'`),
    )
    await step('rate limits', () =>
      db.execute(
        sql`DELETE FROM rate_limits WHERE key LIKE 'verify:%' OR key = ${`order:${hashVisitorKey(checkoutIp)}`}`,
      ),
    )
    for (const id of created.products) {
      await step(`product ${id}`, () => payload.delete({ collection: 'products', id }))
    }
    for (const id of created.services) {
      await step(`service ${id}`, () => payload.delete({ collection: 'services', id }))
    }
    if (admin) {
      const adminId = admin.id
      await step('admin', () => payload.delete({ collection: 'users', id: adminId }))
    }

    const leftovers = await db.execute(sql`
      SELECT (SELECT count(*) FROM bookings) AS bookings, (SELECT count(*) FROM orders) AS orders,
             (SELECT count(*) FROM products) AS products, (SELECT count(*) FROM services) AS services,
             (SELECT count(*) FROM users) AS users`)
    console.log('\nRows left after cleanup:', leftovers.rows[0])
  }

  console.log(
    '\n' +
      results
        .map(
          (r) =>
            `${r.passed ? 'PASS' : 'FAIL'}  [expect ${r.expected.padEnd(4)}] ${r.check}\n        → ${r.detail}`,
        )
        .join('\n'),
  )
  const failed = results.filter((r) => !r.passed).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  process.exit(failed ? 1 : 0)
}

await main()
