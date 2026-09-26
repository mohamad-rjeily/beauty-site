import { ValidationError, type Payload } from 'payload'
import { z } from 'zod'

import { isBookingTakenError } from '@/lib/bookingErrors'
import { phoneSchema } from '@/lib/phone'
import { businessTime, freeSlots, type DaySlots } from '@/lib/slots'
import { BUSINESS_TIME_ZONE, businessDateKeyFromToday } from '@/lib/time'
import type { Booking, Service } from '@/payload-types'

/**
 * The public booking flow, on the server. Used by the booking page's server actions and by
 * scripts/verify-rules.ts, so it takes `payload` instead of creating it.
 *
 * Every call here is made WITHOUT a user: the booking hook then applies every website rule
 * (notice, window, hours, step, closed dates), not only the ones admins also get.
 */

const DAY = 24 * 60 * 60 * 1000

/** An active service the public may book, or null. Public read rules: inactive ones stay hidden. */
const findBookableService = async (
  payload: Payload,
  serviceId: number,
): Promise<Service | null> => {
  const found = await payload.find({
    collection: 'services',
    where: { and: [{ id: { equals: serviceId } }, { active: { equals: true } }] },
    depth: 0,
    limit: 1,
    overrideAccess: false,
  })
  return found.docs[0] ?? null
}

/**
 * Free start times for a time-slot service over the whole booking window. Reads only the
 * start and busy-until time of existing bookings (never names or phones), and returns only
 * dates and free times. Null when the service isn't bookable by time slot.
 */
export const loadFreeSlots = async (
  payload: Payload,
  serviceId: number,
  now: Date = new Date(),
): Promise<DaySlots[] | null> => {
  const service = await findBookableService(payload, serviceId)
  if (!service || service.bookingMode !== 'slot') return null

  const rules = await payload.findGlobal({ slug: 'availability', depth: 0, overrideAccess: false })
  // One extra day on each side covers the Beirut / UTC date difference.
  const windowEnd = new Date(now.getTime() + (rules.maxDaysAhead + 2) * DAY)

  // Bookings are admin-only; this server read is limited to the two time columns.
  const bookings = await payload.find({
    collection: 'bookings',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { startTime: true, occupiedUntil: true },
    where: {
      and: [
        { status: { not_equals: 'cancelled' } },
        { startTime: { exists: true } },
        { startTime: { less_than: windowEnd.toISOString() } },
        { occupiedUntil: { greater_than: now.toISOString() } },
      ],
    },
  })

  return freeSlots({
    rules,
    durationMinutes: service.duration,
    now,
    busy: bookings.docs
      .filter((b) => b.startTime && b.occupiedUntil)
      .map((b) => ({ start: b.startTime as string, until: b.occupiedUntil as string })),
  })
}

// ── Input ─────────────────────────────────────────────────────────────────

const details = {
  serviceId: z.number().int().positive(),
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  notes: z.string().trim().max(1000).optional().default(''),
}

const slotInput = z.object({ ...details, startTime: z.iso.datetime() })

const requestInput = z
  .object({
    ...details,
    requestedDate: z.iso.date(),
    locationType: z.enum(['studio', 'onLocation']),
    locationAddress: z.string().trim().max(500).optional().default(''),
    peopleCount: z.number().int().min(1).max(50),
    wantsTrial: z.boolean().optional().default(false),
  })
  .refine((v) => v.locationType !== 'onLocation' || v.locationAddress.length > 0, {
    path: ['locationAddress'],
  })
  .refine((v) => v.requestedDate >= businessDateKeyFromToday(0), { path: ['requestedDate'] })

/** Form fields the page can show an error on. */
export type BookingField =
  'name' | 'phone' | 'notes' | 'requestedDate' | 'locationType' | 'locationAddress' | 'peopleCount'

export type BookingResult =
  | { ok: true }
  | { ok: false; reason: 'invalid'; fields: BookingField[] }
  /** Someone else booked the time first: pick another one. */
  | { ok: false; reason: 'slotTaken' }
  /** The time is no longer allowed (notice passed, hours changed...): pick another one. */
  | { ok: false; reason: 'slotGone' }
  /** The service was switched off or removed. */
  | { ok: false; reason: 'unavailable' }
  | { ok: false; reason: 'rateLimited' }
  | { ok: false; reason: 'error' }

const FIELD_OF: Record<string, BookingField> = {
  name: 'name',
  customerName: 'name',
  phone: 'phone',
  notes: 'notes',
  requestedDate: 'requestedDate',
  locationType: 'locationType',
  locationAddress: 'locationAddress',
  peopleCount: 'peopleCount',
}

const invalid = (paths: PropertyKey[][]): BookingResult => ({
  ok: false,
  reason: 'invalid',
  fields: [
    ...new Set(paths.map((p) => FIELD_OF[String(p[0])]).filter((f): f is BookingField => !!f)),
  ],
})

/**
 * Validates the form and creates a `pending` booking through the Local API, without a user.
 * Never trusts the client for anything but the customer's own answers: the mode, end time,
 * break and status all come from the server.
 */
export const createPublicBooking = async (
  payload: Payload,
  raw: unknown,
): Promise<BookingResult> => {
  const serviceId = (raw as { serviceId?: unknown } | null)?.serviceId
  if (typeof serviceId !== 'number') return { ok: false, reason: 'unavailable' }
  const service = await findBookableService(payload, serviceId)
  if (!service) return { ok: false, reason: 'unavailable' }

  let data: Partial<Booking>
  if (service.bookingMode === 'slot') {
    const parsed = slotInput.safeParse(raw)
    if (!parsed.success) {
      if (parsed.error.issues.some((i) => i.path[0] === 'startTime')) {
        return { ok: false, reason: 'slotGone' }
      }
      return invalid(parsed.error.issues.map((i) => i.path))
    }
    const v = parsed.data
    data = {
      customerName: v.name,
      phone: v.phone,
      service: service.id,
      startTime: v.startTime,
      startTime_tz: BUSINESS_TIME_ZONE,
      notes: v.notes || null,
    }
  } else {
    const parsed = requestInput.safeParse(raw)
    if (!parsed.success) return invalid(parsed.error.issues.map((i) => i.path))
    const v = parsed.data
    data = {
      customerName: v.name,
      phone: v.phone,
      service: service.id,
      // Noon in Beirut: the date reads the same in every time zone the admin could use.
      requestedDate: businessTime(v.requestedDate, 12 * 60)?.toISOString(),
      requestedDate_tz: BUSINESS_TIME_ZONE,
      locationType: v.locationType,
      locationAddress: v.locationType === 'onLocation' ? v.locationAddress : null,
      peopleCount: v.peopleCount,
      wantsTrial: v.wantsTrial,
      notes: v.notes || null,
    }
  }

  try {
    await payload.create({
      collection: 'bookings',
      // Bookings are admin-only through the API. This server code may create one, but
      // without `user`, so the booking hook still applies every website rule.
      overrideAccess: true,
      data: data as Booking,
    })
    return { ok: true }
  } catch (error) {
    if (isBookingTakenError(error)) return { ok: false, reason: 'slotTaken' }
    if (error instanceof ValidationError) {
      const paths = error.data.errors.map((e) => e.path)
      if (paths.includes('service')) return { ok: false, reason: 'unavailable' }
      if (paths.includes('startTime')) return { ok: false, reason: 'slotGone' }
      return invalid(paths.map((p) => [p]))
    }
    // Log the failure kind only: the booking data is private.
    payload.logger.error(
      `Public booking failed: ${(error as Error)?.name ?? 'unknown error'} ${(error as { code?: string })?.code ?? ''}`,
    )
    return { ok: false, reason: 'error' }
  }
}
