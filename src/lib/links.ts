import { format, getDictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'

/** wa.me link with a pre-filled message. `number` is E.164 (+961...). */
export const whatsappHref = (number: string, message: string): string => {
  const base = `https://wa.me/${number.replace(/\D/g, '')}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

type BookingTarget = {
  locale: Locale
  whatsappNumber?: string | null
  /** Optional context, e.g. a service or category name, added to the message. */
  subject?: string
}

/**
 * THE destination of every "Book" button on the site. Until the booking page exists
 * (phase 4) it opens WhatsApp with a pre-filled request; phase 4 changes only this function.
 * Returns null when there is nowhere to send the visitor (no WhatsApp number yet), so
 * callers hide the button instead of rendering a dead link.
 */
export const bookingHref = ({ locale, whatsappNumber, subject }: BookingTarget): string | null => {
  if (!whatsappNumber) return null
  const t = getDictionary(locale)
  const message = subject
    ? format(t.whatsappBookingService, { service: subject })
    : t.whatsappBooking
  return whatsappHref(whatsappNumber, message)
}

/** Every "Order" button until the shop checkout exists (phase 5): same single-place rule. */
export const orderHref = ({
  locale,
  whatsappNumber,
  productName,
}: {
  locale: Locale
  whatsappNumber?: string | null
  productName: string
}): string | null => {
  if (!whatsappNumber) return null
  return whatsappHref(
    whatsappNumber,
    format(getDictionary(locale).whatsappOrder, { product: productName }),
  )
}

/** Booking links open WhatsApp, a different site: new tab, no referrer leakage. */
export const externalLinkProps = { target: '_blank', rel: 'noopener noreferrer' } as const
