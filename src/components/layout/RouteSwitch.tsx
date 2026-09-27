'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** True on /en/book and /ar/book. */
export const isBookingPath = (pathname: string | null): boolean =>
  /^\/[a-z]{2}\/book\/?$/.test(pathname ?? '')

/** True on the cart (and checkout) page. */
export const isCartPath = (pathname: string | null): boolean =>
  /^\/[a-z]{2}\/cart\/?$/.test(pathname ?? '')

/** True on the shop list and product pages. */
export const isShopPath = (pathname: string | null): boolean =>
  /^\/[a-z]{2}\/shop(\/|$)/.test(pathname ?? '')

/**
 * Chooses between two server-rendered pieces of the site chrome (they arrive as props, so
 * they stay Server Components): `focusedPage` on the pages that are a task of their own (the
 * booking page and the cart), `otherPages` everywhere else. The layout is shared by every page
 * and doesn't know the current path; this does.
 */
export function RouteSwitch({
  focusedPage = null,
  otherPages,
}: {
  focusedPage?: ReactNode
  otherPages: ReactNode
}) {
  const pathname = usePathname()
  return <>{isBookingPath(pathname) || isCartPath(pathname) ? focusedPage : otherPages}</>
}
