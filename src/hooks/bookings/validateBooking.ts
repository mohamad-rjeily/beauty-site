import { sql } from '@payloadcms/db-postgres'
import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { isAdminRequest } from '@/access/isAdminRequest'
import { bookingTakenMessage } from '@/lib/bookingErrors'
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
 * Arbitrary constant key for a Postgres advisory lock. Every booking write that involves
 * times takes this lock (released automatically when the transaction ends), so two requests
 * can't both pass the overlap check at the same moment. The exclusion constraint added in
 * the migrations stays the final guarantee underneath.
 */
const BOOKINGS_LOCK_KEY = 72_140_001

const MINUTE = 60_000
const HOUR = 60 * MINUTE

type DateInput = Date | string | null | undefined

const fail = (req: PayloadRequest, path: string, en: string, ar: string): never => {
  throw new ValidationError({
    collection: 'bookings',
    errors: [{ path, message: msg(req, en, ar) }],
    req,
  })
}

const toDate = (value: DateInput): Date | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const sameInstant = (a: DateInput, b: DateInput): boolean =>
  (toDate(a)?.getTime() ?? null) === (toDate(b)?.getTime() ?? null)

/** The value being saved: the new one if the request sent the field (even null), else the stored one. */
const incoming = <K extends keyof Booking>(
  data: Partial<Booking>,
  previous: Booking | undefined,
  key: K,
): Booking[K] | undefined => (key in data ? data[key] : previous?.[key])

/**
 * Runs on every create and update, on the server, inside the operation's transaction.
 *
 * Always, for everyone:
 * - a new booking starts as `pending`; its `mode` is copied from the service and never changes
 *   (switching to a service with the other mode is refused: cancel and create a new booking)
 * - slot: end = start + service duration (never taken from the client)
 * - request: no times on creation; later the owner enters start AND end herself,
 *   and a request can't be confirmed or completed without them
 * - occupiedUntil = end + break; the overlap check and the DB constraint both use it,
 *   so the break after each appointment is enforced by the database too
 * - no overlap with any other non-cancelled booking that has times
 *
 * Only for requests without a logged-in admin (the public website, see isAdminRequest):
 * - minimum notice and the booking window, when the time is new or changed
 * - inside one working-hours range, on a start-time step, not on a closed date
 */
export const validateBooking: CollectionBeforeChangeHook<Booking> = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const previous = operation === 'update' ? originalDoc : undefined
  if (operation === 'create') data.status = 'pending'

  const serviceId = relationId(data.service ?? previous?.service)
  // A missing service is reported by field validation right after this hook.
  if (!serviceId) return data

  const service = await req.payload
    .findByID({ collection: 'services', id: serviceId, depth: 0, req, overrideAccess: true })
    .catch(() => null)
  if (!service) {
    return fail(req, 'service', 'This service no longer exists.', 'هذه الخدمة لم تعد موجودة.')
  }

  const serviceChanged = !previous || serviceId !== relationId(previous.service)
  if (previous && serviceChanged && service.bookingMode !== previous.mode) {
    fail(
      req,
      'service',
      'This service uses a different booking type. Cancel this booking and create a new one.',
      'هذه الخدمة تستخدم نوع حجز مختلفاً. ألغي هذا الحجز وأنشئي حجزاً جديداً.',
    )
  }
  if (serviceChanged && !service.active) {
    fail(
      req,
      'service',
      'This service is not available for booking.',
      'هذه الخدمة غير متاحة للحجز.',
    )
  }

  const mode = previous?.mode ?? service.bookingMode
  data.mode = mode
  const status = data.status ?? previous?.status ?? 'pending'

  // ── Work out the times being saved ──────────────────────────────────────
  let start: Date | null
  let end: Date | null

  if (mode === 'slot') {
    start = toDate(incoming(data, previous, 'startTime'))
    if (!start) return fail(req, 'startTime', 'Choose a start time.', 'اختاري وقت البدء.')
    end = new Date(start.getTime() + service.duration * MINUTE)
  } else if (!previous) {
    // A new request never carries times, whatever the client sent.
    start = null
    end = null
  } else {
    start = toDate(incoming(data, previous, 'startTime'))
    end = toDate(incoming(data, previous, 'endTime'))

    if ((start === null) !== (end === null)) {
      fail(
        req,
        start ? 'endTime' : 'startTime',
        'Enter both the start and the end time.',
        'أدخلي وقت البدء ووقت الانتهاء معاً.',
      )
    }
    if (!start && (status === 'confirmed' || status === 'completed')) {
      fail(
        req,
        'startTime',
        'Enter the start and end time before confirming this request.',
        'أدخلي وقت البدء ووقت الانتهاء قبل تأكيد هذا الطلب.',
      )
    }
    if (start && end && end <= start) {
      fail(
        req,
        'endTime',
        'The end must be after the start.',
        'يجب أن يكون وقت الانتهاء بعد وقت البدء.',
      )
    }
  }

  if (!start || !end) {
    // Request without times yet: it doesn't block the calendar.
    data.startTime = null
    data.endTime = null
    data.occupiedUntil = null
    return data
  }

  const timeChanged =
    !previous || !sameInstant(start, previous.startTime) || !sameInstant(end, previous.endTime)
  const reactivated = Boolean(previous && previous.status === 'cancelled' && status !== 'cancelled')

  if (previous && !timeChanged && !reactivated) {
    // Status or notes change only: the stored times stay exactly as they are.
    data.startTime = previous.startTime
    data.endTime = previous.endTime
    data.occupiedUntil = previous.occupiedUntil
    return data
  }

  // Serialize all booking checks: held until this transaction commits or rolls back.
  const db = await getTransactionDb(req)
  await db.execute(sql`SELECT pg_advisory_xact_lock(${BOOKINGS_LOCK_KEY})`)

  const availability: Availability = await req.payload.findGlobal({
    slug: 'availability',
    depth: 0,
    req,
    overrideAccess: true,
  })

  // Keep the break a booking was made with, unless its time changes.
  const bufferMinutes =
    !timeChanged && previous?.occupiedUntil && previous.endTime
      ? (new Date(previous.occupiedUntil).getTime() - new Date(previous.endTime).getTime()) / MINUTE
      : availability.bufferMinutes
  const occupiedUntil = new Date(end.getTime() + bufferMinutes * MINUTE)

  data.startTime = start.toISOString()
  data.endTime = end.toISOString()
  data.occupiedUntil = occupiedUntil.toISOString()

  // ── Website rules. Admins are exempt: she decides when she works. ──────
  if (!isAdminRequest(req)) {
    if (timeChanged) {
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
    const endMinute = startMinute + (end.getTime() - start.getTime()) / MINUTE

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
    if (closed) {
      fail(req, 'startTime', 'The studio is closed on this date.', 'الاستوديو مغلق في هذا التاريخ.')
    }
  }

  // ── Overlap with other bookings, breaks included. Applies to everyone. ──
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
          { startTime: { exists: true } },
          { startTime: { less_than: occupiedUntil.toISOString() } },
          { occupiedUntil: { greater_than: start.toISOString() } },
          ...(previous ? [{ id: { not_equals: previous.id } }] : []),
        ],
      },
    })
    if (clash.docs.length > 0) {
      throw new ValidationError({
        collection: 'bookings',
        errors: [{ path: 'startTime', message: bookingTakenMessage(req) }],
        req,
      })
    }
  }

  return data
}
