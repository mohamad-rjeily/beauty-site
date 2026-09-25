import { NextResponse, type NextRequest } from 'next/server'

import { defaultLocale, isLocale, LOCALE_COOKIE, locales, type Locale } from './i18n/config'

/**
 * Next.js 16 "proxy" (formerly middleware). Puts every public URL under /en or /ar:
 * - a path that already has a locale passes through and remembers it in a cookie;
 * - anything else is redirected, choosing the remembered language, then the browser's
 *   Accept-Language, then English.
 * The admin, the API, Next internals and files never reach this function (see matcher).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const first = pathname.split('/')[1] ?? ''

  if (isLocale(first)) {
    const response = NextResponse.next()
    if (request.cookies.get(LOCALE_COOKIE)?.value !== first) {
      response.cookies.set(LOCALE_COOKIE, first, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      })
    }
    return response
  }

  const url = request.nextUrl.clone()
  url.pathname = `/${preferredLocale(request)}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

const preferredLocale = (request: NextRequest): Locale => {
  const remembered = request.cookies.get(LOCALE_COOKIE)?.value
  if (remembered && isLocale(remembered)) return remembered

  // "ar-LB,ar;q=0.9,en;q=0.8" -> the first supported language by quality.
  const accepted = (request.headers.get('accept-language') ?? '')
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=')
      return { language: tag.toLowerCase().split('-')[0], quality: q ? Number(q) : 1 }
    })
    .sort((a, b) => b.quality - a.quality)

  return (accepted.find((entry) => (locales as readonly string[]).includes(entry.language))
    ?.language ?? defaultLocale) as Locale
}

export const config = {
  // Skip the admin, the API, Next internals and anything with a file extension.
  matcher: ['/((?!admin|api|_next|.*\\..*).*)'],
}
