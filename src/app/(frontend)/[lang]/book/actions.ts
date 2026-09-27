'use server'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { createPublicBooking, loadFreeSlots, type BookingResult } from '@/lib/booking'
import { withinLimit, type Limit } from '@/lib/rateLimit'
import type { DaySlots } from '@/lib/slots'

/**
 * Server Actions of the booking page. Each one is a public POST endpoint (anyone can call
 * it without the page), so each validates its own input and applies its own rate limit.
 * Nothing here passes a `user` to Payload: the booking hook applies every website rule.
 */

// Slots: browsing days and retrying is normal. It only stops scripted scraping.
const SLOTS: Limit = { bucket: 'slots', perVisitor: 120, siteWide: 2000, windowSeconds: 600 }
const BOOK: Limit = { bucket: 'book', perVisitor: 5, siteWide: 60, windowSeconds: 600 }

export type SlotsResult =
  { ok: true; days: DaySlots[] } | { ok: false; reason: 'unavailable' | 'rateLimited' | 'error' }

/** Free start times of a time-slot service. Only dates and times ever leave the server. */
export async function getFreeSlots(serviceId: unknown): Promise<SlotsResult> {
  if (typeof serviceId !== 'number' || !Number.isInteger(serviceId)) {
    return { ok: false, reason: 'unavailable' }
  }
  const payload = await getPayload({ config })
  try {
    if (!(await withinLimit(payload, SLOTS, await headers()))) return { ok: false, reason: 'rateLimited' }
    const days = await loadFreeSlots(payload, serviceId)
    return days ? { ok: true, days } : { ok: false, reason: 'unavailable' }
  } catch (error) {
    payload.logger.error(`Free slots failed: ${(error as Error)?.name ?? 'unknown error'}`)
    return { ok: false, reason: 'error' }
  }
}

/**
 * Sends the booking form. `website` is a honeypot: a field people never see or fill. When a
 * bot fills it, the answer looks like success, but nothing is saved.
 */
export async function submitBooking(input: unknown): Promise<BookingResult> {
  const honeypot = (input as { website?: unknown } | null)?.website
  if (typeof honeypot === 'string' && honeypot.trim() !== '') return { ok: true }

  const payload = await getPayload({ config })
  try {
    if (!(await withinLimit(payload, BOOK, await headers()))) return { ok: false, reason: 'rateLimited' }
  } catch (error) {
    payload.logger.error(`Booking rate limit failed: ${(error as Error)?.name ?? 'unknown error'}`)
    return { ok: false, reason: 'error' }
  }
  return createPublicBooking(payload, input)
}
