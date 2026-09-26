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

import { isBookingOverlapError } from '../src/lib/bookingErrors'
import { BUSINESS_TIME_ZONE, businessDateKeyFromToday } from '../src/lib/time'
import type { Availability, User } from '../src/payload-types'

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

  try {
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

    // ── 6. Confirming an order with more quantity than stock ───────────────
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

    // ── 7. A delivered order changed to cancelled ──────────────────────────
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
        address: 'TEST street',
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
  } finally {
    // ── Cleanup: delete everything this script created ─────────────────────
    for (const id of created.orders) await payload.delete({ collection: 'orders', id })
    for (const id of created.bookings) await payload.delete({ collection: 'bookings', id })
    for (const id of created.products) await payload.delete({ collection: 'products', id })
    for (const id of created.services) await payload.delete({ collection: 'services', id })
    if (admin) await payload.delete({ collection: 'users', id: admin.id })
    await db.execute(sql`DELETE FROM bookings WHERE customer_name LIKE 'TEST%'`)
    const { id: _id, createdAt: _c, updatedAt: _u, ...restore } = originalAvailability
    await payload.updateGlobal({ slug: 'availability', data: restore })

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
