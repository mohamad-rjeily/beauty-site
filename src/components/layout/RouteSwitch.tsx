'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** True on /en/book and /ar/book. */
export const isBookingPath = (pathname: string | null): boolean =>
  /^\/[a-z]{2}\/book\/?$/.test(pathname ?? '')

/**
 * Chooses between two server-rendered pieces of the site chrome (they arrive as props, so
 * they stay Server Components): `bookPage` on the booking page, `otherPages` everywhere else.
 * The layout is shared by every page and doesn't know the current path; this does.
 */
export function RouteSwitch({
  bookPage = null,
  otherPages,
}: {
  bookPage?: ReactNode
  otherPages: ReactNode
}) {
  return <>{isBookingPath(usePathname()) ? bookPage : otherPages}</>
}
