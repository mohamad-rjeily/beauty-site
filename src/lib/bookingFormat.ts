import { intlLocale, type Locale } from '@/i18n/config'

/**
 * Date and time labels for the booking page. Plain Intl, no libraries, so it is light enough
 * for the browser. Times are always shown on the Beirut clock, whatever the phone's zone.
 */
const BEIRUT = 'Asia/Beirut'

/** A Beirut date key ("2026-10-20"), formatted. Noon UTC is the same calendar day everywhere. */
export const formatDay = (
  key: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): string =>
  new Intl.DateTimeFormat(intlLocale(locale), { timeZone: 'UTC', ...options }).format(
    new Date(`${key}T12:00:00Z`),
  )

/** "13:30" on the Beirut clock. */
export const formatTime = (iso: string, locale: Locale): string =>
  new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: BEIRUT,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))

/** "Tuesday 20 October, 13:30" (Beirut). */
export const formatWhen = (iso: string, locale: Locale): string =>
  `${new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: BEIRUT,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso))}${locale === 'ar' ? '،' : ','} ${formatTime(iso, locale)}`

/**
 * Today's date in Beirut, "YYYY-MM-DD". Built from parts: a locale's date layout (even
 * en-CA's) differs between browsers, the parts never do.
 */
export const beirutToday = (): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BEIRUT,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
