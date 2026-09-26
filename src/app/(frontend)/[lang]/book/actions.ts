'use server'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { createPublicBooking, loadFreeSlots, type BookingResult } from '@/lib/booking'
import { consumeRateLimit, hashVisitorKey } from '@/lib/rateLimit'
import type { DaySlots } from '@/lib/slots'

/**
 * Server Actions of the booking page. Each one is a public POST endpoint (anyone can call
 * it without the page), so each validates its own input and applies its own rate limit.
 * Nothing here passes a `user` to Payload: the booking hook applies every website rule.
 */

/** The visitor's IP as seen by the host's proxy (Vercel and most hosts set these headers). */
const visitorKey = async (): Promise<string> => {
  const list = await headers()
  const ip =
    list.get('x-forwarded-for')?.split(',')[0]?.trim() || list.get('x-real-ip') || 'unknown'
  return hashVisitorKey(ip)
}

export type SlotsResult =
  { ok: true; days: DaySlots[] } | { ok: false; reason: 'unavailable' | 'rateLimited' | 'error' }

/** Free start times of a time-slot service. Only dates and times ever leave the server. */
export async function getFreeSlots(serviceId: unknown): Promise<SlotsResult> {
  if (typeof serviceId !== 'number' || !Number.isInteger(serviceId)) {
    return { ok: false, reason: 'unavailable' }
  }
  const payload = await getPayload({ config })
  try {
    // Generous: browsing days and retrying is normal. It only stops scripted scraping.
    const allowed = await consumeRateLimit(payload, {
      bucket: 'slots',
      key: await visitorKey(),
      limit: 120,
      windowSeconds: 600,
    })
    if (!allowed) return { ok: false, reason: 'rateLimited' }
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
    const allowed = await consumeRateLimit(payload, {
      bucket: 'book',
      key: await visitorKey(),
      limit: 5,
      windowSeconds: 600,
    })
    if (!allowed) return { ok: false, reason: 'rateLimited' }
  } catch (error) {
    payload.logger.error(`Booking rate limit failed: ${(error as Error)?.name ?? 'unknown error'}`)
    return { ok: false, reason: 'error' }
  }
  return createPublicBooking(payload, input)
}
