import { sql } from '@payloadcms/db-postgres'
import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { getTransactionDb, relationId } from '@/lib/db'
import { msg } from '@/lib/i18n'
import {
  businessDateKey,
  businessDateKeyFromToday,
  inBusinessZone,
  minutesOfDay,
  WEEKDAYS,
} from '@/lib/time'
import type { Availability, Booking } from '@/payload-types'

/**
 * Arbitrary constant key for a Postgres advisory lock. Every booking write takes this
 * lock (it is released automatically when the transaction ends), so two requests can't
 * both pass the overlap check at the same moment. The exclusion constraint added in the
 * migrations stays the final guarantee underneath.
 */
const BOOKINGS_LOCK_KEY = 72_140_001

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const fail = (req: PayloadRequest, path: string, en: string, ar: string): never => {
  throw new ValidationError({
    collection: 'bookings',
    errors: [{ path, message: msg(req, en, ar) }],
    req,
  })
}

const sameInstant = (a: string | null | undefined, b: string | null | undefined): boolean =>
  (a ? new Date(a).getTime() : null) === (b ? new Date(b).getTime() : null)

/**
 * Runs on every create and update, on the server, inside the operation's transaction.
 *
 * Always:
 * - a new booking starts as `pending`
 * - end time = start + service duration (the client can never set it)
 * - occupiedUntil = end + buffer; the overlap check and the DB constraint use it,
 *   so the buffer after each appointment is enforced by the database too
 *
 * When the time or service changes, or a cancelled booking is reactivated:
 * - fits fully inside one working-hours range (Beirut time) on a start-time step
 * - does not touch a closed date
 * - does not overlap any other non-cancelled booking (including its buffer)
 *
 * Only when the time or service changes (a new request or a reschedule):
 * - service is active, minimum notice respected, not beyond the booking window.
 *   Confirming or cancelling an existing booking never trips these time-based rules.
 */
export const validateBooking: CollectionBeforeChangeHook<Booking> = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (operation === 'create') data.status = 'pending'

  const previous = operation === 'update' ? originalDoc : undefined
  const serviceId = relationId(data.service ?? previous?.service)
  const startTime = data.startTime ?? previous?.startTime
  const status = data.status ?? previous?.status ?? 'pending'

  // Missing required fields are reported by field validation right after this hook.
  if (!serviceId || !startTime) return data

  const timeChanged =
    !previous ||
    !sameInstant(startTime, previous.startTime) ||
    serviceId !== relationId(previous.service)
  const reactivated = Boolean(previous && previous.status === 'cancelled' && status !== 'cancelled')

  if (!timeChanged && !reactivated) {
    // Status or notes change only: the computed times stay exactly as stored.
    if (previous) {
      data.endTime = previous.endTime
      data.occupiedUntil = previous.occupiedUntil
    }
    return data
  }

  // Serialize all booking checks: held until this transaction commits or rolls back.
  const db = await getTransactionDb(req)
  await db.execute(sql`SELECT pg_advisory_xact_lock(${BOOKINGS_LOCK_KEY})`)

  const service = await req.payload
    .findByID({ collection: 'services', id: serviceId, depth: 0, req, overrideAccess: true })
    .catch(() => null)
  if (!service)
    return fail(req, 'service', 'This service no longer exists.', 'هذه الخدمة لم تعد موجودة.')

  const availability: Availability = await req.payload.findGlobal({
    slug: 'availability',
    depth: 0,
    req,
    overrideAccess: true,
  })

  const start = new Date(startTime)
  if (Number.isNaN(start.getTime()))
    return fail(req, 'startTime', 'Invalid start time.', 'وقت البدء غير صالح.')

  const end = new Date(start.getTime() + service.duration * MINUTE)
  // Keep the buffer a booking was made with, unless its time changes.
  const bufferMinutes =
    !timeChanged && previous?.occupiedUntil && previous.endTime
      ? (new Date(previous.occupiedUntil).getTime() - new Date(previous.endTime).getTime()) / MINUTE
      : availability.bufferMinutes
  const occupiedUntil = new Date(end.getTime() + bufferMinutes * MINUTE)

  data.endTime = end.toISOString()
  data.occupiedUntil = occupiedUntil.toISOString()

  // ── Rules for new requests and reschedules ─────────────────────────────
  if (timeChanged) {
    if (!service.active) {
      fail(
        req,
        'service',
        'This service is not available for booking.',
        'هذه الخدمة غير متاحة للحجز.',
      )
    }

    if (start.getTime() < Date.now() + availability.minNoticeHours * HOUR) {
      fail(
        req,
        'startTime',
        `Bookings need at least ${availability.minNoticeHours} hours' notice.`,
        `يجب الحجز قبل ${availability.minNoticeHours} ساعة على الأقل.`,
      )
    }

    if (businessDateKey(start) > businessDateKeyFromToday(availability.maxDaysAhead)) {
      fail(
        req,
        'startTime',
        `Bookings can be made at most ${availability.maxDaysAhead} days ahead.`,
        `يمكن الحجز قبل ${availability.maxDaysAhead} يوماً كحد أقصى.`,
      )
    }
  }

  // ── Working hours, start-time step, closed dates (Beirut wall clock) ────
  const zonedStart = inBusinessZone(start)
  const dateKey = businessDateKey(start)

  if (
    businessDateKey(end) !== dateKey ||
    zonedStart.getSeconds() !== 0 ||
    zonedStart.getMilliseconds() !== 0
  ) {
    fail(
      req,
      'startTime',
      'The appointment must start and end on the same day.',
      'يجب أن يبدأ الموعد وينتهي في اليوم نفسه.',
    )
  }

  const weekday = WEEKDAYS[zonedStart.getDay()]
  const startMinute = zonedStart.getHours() * 60 + zonedStart.getMinutes()
  const endMinute = startMinute + service.duration

  const range = (availability.weeklyHours ?? []).find(
    (r) =>
      r.day === weekday &&
      minutesOfDay(r.opens) <= startMinute &&
      endMinute <= minutesOfDay(r.closes),
  )
  if (!range) {
    fail(
      req,
      'startTime',
      'The whole appointment must fit inside working hours.',
      'يجب أن يكون الموعد بالكامل ضمن ساعات العمل.',
    )
  } else if ((startMinute - minutesOfDay(range.opens)) % availability.slotIntervalMinutes !== 0) {
    fail(
      req,
      'startTime',
      `Appointments start every ${availability.slotIntervalMinutes} minutes from ${range.opens}.`,
      `تبدأ المواعيد كل ${availability.slotIntervalMinutes} دقيقة ابتداءً من ${range.opens}.`,
    )
  }

  const closed = (availability.blockedDates ?? []).some((b) => {
    const from = businessDateKey(b.from)
    const to = b.to ? businessDateKey(b.to) : from
    return dateKey >= from && dateKey <= to
  })
  if (closed)
    fail(req, 'startTime', 'The studio is closed on this date.', 'الاستوديو مغلق في هذا التاريخ.')

  // ── Overlap with other bookings, buffers included ───────────────────────
  if (status !== 'cancelled') {
    const clash = await req.payload.find({
      collection: 'bookings',
      depth: 0,
      limit: 1,
      req,
      overrideAccess: true,
      where: {
        and: [
          { status: { not_equals: 'cancelled' } },
          { startTime: { less_than: occupiedUntil.toISOString() } },
          { occupiedUntil: { greater_than: start.toISOString() } },
          ...(previous ? [{ id: { not_equals: previous.id } }] : []),
        ],
      },
    })
    if (clash.docs.length > 0) {
      fail(
        req,
        'startTime',
        'This time is already taken. Please choose another slot.',
        'هذا الوقت محجوز. الرجاء اختيار وقت آخر.',
      )
    }
  }

  return data
}
