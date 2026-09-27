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

/** The shop, or one category of it (`/en/shop?category=homemade-masks`). */
export const shopHref = (locale: Locale, category?: string | null): string =>
  category ? `/${locale}/shop?category=${encodeURIComponent(category)}` : `/${locale}/shop`

/** A product page. The slug is shared by both languages. */
export const productHref = (locale: Locale, slug: string): string =>
  `/${locale}/shop/${encodeURIComponent(slug)}`

export type PageKey = 'services' | 'gallery' | 'about' | 'contact' | 'shop'

/** The address of a site page. */
export const pageHref = (locale: Locale, page: PageKey | 'home'): string =>
  page === 'home' ? `/${locale}` : `/${locale}/${page}`

/** Links to other sites (WhatsApp, maps, Instagram): new tab, no referrer leakage. */
export const externalLinkProps = { target: '_blank', rel: 'noopener noreferrer' } as const
