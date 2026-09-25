import type { AfterErrorHook } from 'payload'

import { msg } from '@/lib/i18n'

/** Name of the exclusion constraint created in src/migrations (booking_constraints). */
export const BOOKING_OVERLAP_CONSTRAINT = 'bookings_no_overlap'

/** Postgres SQLSTATE for an exclusion-constraint violation. */
const EXCLUSION_VIOLATION = '23P01'

/**
 * True when an error (or any error in its `cause` chain; Drizzle wraps the pg error)
 * is the database refusing two overlapping bookings.
 *
 * The booking hook normally catches overlaps first, under an advisory lock. This is the
 * safety net for anything that still reaches the database. Phase 4's booking server action
 * should use it too, to show the same friendly message.
 */
export const isBookingOverlapError = (error: unknown): boolean => {
  let current: unknown = error
  for (let depth = 0; current && depth < 5; depth++) {
    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown }
    if (candidate.code === EXCLUSION_VIOLATION) {
      return (
        candidate.constraint === undefined || candidate.constraint === BOOKING_OVERLAP_CONSTRAINT
      )
    }
    current = candidate.cause
  }
  return false
}

export const bookingTakenMessage = (req?: Parameters<typeof msg>[0]) =>
  msg(
    req,
    'This time was just taken. Please choose another time.',
    'تم حجز هذا الوقت للتو. الرجاء اختيار وقت آخر.',
  )

/**
 * Admin panel and REST API: turns the constraint error into a normal 400 validation error
 * on the start-time field, instead of a generic "Something went wrong".
 */
export const bookingOverlapAfterError: AfterErrorHook = ({ error, req }) => {
  if (!isBookingOverlapError(error)) return
  const message = bookingTakenMessage(req)
  return {
    status: 400,
    response: {
      errors: [
        {
          name: 'ValidationError',
          message,
          data: { collection: 'bookings', errors: [{ path: 'startTime', message }] },
        },
      ],
    },
  }
}
