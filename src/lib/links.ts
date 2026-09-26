import { format, getDictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'

import { whatsappHref } from './whatsapp'

export { whatsappHref }

type BookingTarget = {
  locale: Locale
  /** A known service: the booking page opens with it selected. */
  service?: string
  /** A category (home service cards): the booking page opens at that group. */
  category?: 'makeup' | 'skincare'
}

/**
 * THE destination of every "Book" button on the site: the booking page, with the service
 * preselected when the button belongs to one (`/en/book?service=bridal-makeup`). WhatsApp
 * stays a separate chat button (see StickyActions).
 */
export const bookingHref = ({ locale, service, category }: BookingTarget): string => {
  const base = `/${locale}/book`
  if (service) return `${base}?service=${encodeURIComponent(service)}`
  if (category) return `${base}#book-${category}`
  return base
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

export type PageKey = 'services' | 'gallery' | 'about' | 'contact' | 'shop'

/** The address of a site page. The shop lives on the home page until phase 5. */
export const pageHref = (locale: Locale, page: PageKey | 'home'): string =>
  page === 'home' ? `/${locale}` : page === 'shop' ? `/${locale}#shop` : `/${locale}/${page}`

/** Links to other sites (WhatsApp, maps, Instagram): new tab, no referrer leakage. */
export const externalLinkProps = { target: '_blank', rel: 'noopener noreferrer' } as const
