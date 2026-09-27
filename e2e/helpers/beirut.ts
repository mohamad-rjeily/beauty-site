/**
 * Beirut time maths for the tests, written independently of src/lib/slots.ts (plain Intl, no
 * app code), so the tests check the app's slot logic instead of repeating it.
 */
export const TZ = 'Asia/Beirut'
export const MINUTE = 60_000
export const HOUR = 60 * MINUTE

export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
const WEEKDAYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export type Rules = {
  weeklyHours?: { day: Weekday; opens: string; closes: string }[] | null
  blockedDates?: { from: string; to?: string | null }[] | null
  slotIntervalMinutes: number
  bufferMinutes: number
  minNoticeHours: number
  maxDaysAhead: number
}

export type Busy = { start: number; until: number }

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Wall-clock parts of an instant in Beirut. */
export const beirutParts = (instant: number | Date | string) => {
  const parts = partsFormat.formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "YYYY-MM-DD" in Beirut. */
export const dateKey = (instant: number | Date | string): string => {
  const p = beirutParts(instant)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** Minutes after Beirut midnight. */
export const minuteOfDay = (instant: number | Date | string): number => {
  const p = beirutParts(instant)
  return p.hour * 60 + p.minute
}

/** "HH:mm" in Beirut. */
export const hhmm = (instant: number | Date | string): string => {
  const p = beirutParts(instant)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

export const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Adds calendar days to a date key. */
export const addDays = (key: string, days: number): string => {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export const weekdayOf = (key: string): Weekday => WEEKDAYS[new Date(`${key}T12:00:00Z`).getUTCDay()]

/**
 * The UTC instant of a Beirut wall-clock time, or null when that time doesn't exist that day
 * (the hour skipped when summer time starts).
 */
export const beirutInstant = (key: string, minute: number): number | null => {
  const [y, m, d] = key.split('-').map(Number)
  const wall = Date.UTC(y, m - 1, d, Math.floor(minute / 60), minute % 60)
  // Try both possible offsets (UTC+2 and UTC+3) and keep one that reads back correctly.
  for (const offsetHours of [3, 2]) {
    const candidate = wall - offsetHours * HOUR
    const p = beirutParts(candidate)
    if (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) === wall) return candidate
  }
  return null
}

export const isClosed = (key: string, rules: Rules): boolean =>
  (rules.blockedDates ?? []).some((b) => {
    const from = dateKey(b.from)
    const to = b.to ? dateKey(b.to) : from
    return key >= from && key <= to
  })

/** Working ranges of a date, in minutes. Empty when closed. */
export const rangesOf = (key: string, rules: Rules) =>
  isClosed(key, rules)
    ? []
    : (rules.weeklyHours ?? [])
        .filter((r) => r.day === weekdayOf(key))
        .map((r) => ({ opens: toMinutes(r.opens), closes: toMinutes(r.closes) }))

/**
 * Expected free starts of a service on one Beirut date, as UTC instants, given "now" and the
 * busy ranges ([start, occupiedUntil) of every non-cancelled booking that has times).
 */
export const expectedStarts = (
  key: string,
  rules: Rules,
  durationMinutes: number,
  now: number,
  busy: Busy[],
): number[] => {
  const earliest = now + rules.minNoticeHours * HOUR
  const out = new Set<number>()
  for (const range of rangesOf(key, rules)) {
    for (let m = range.opens; m + durationMinutes <= range.closes; m += rules.slotIntervalMinutes) {
      const start = beirutInstant(key, m)
      if (start === null || start < earliest) continue
      const end = start + durationMinutes * MINUTE
      if (dateKey(end) !== key || dateKey(end - 1) !== key) continue
      const until = end + rules.bufferMinutes * MINUTE
      if (busy.some((b) => b.start < until && b.until > start)) continue
      out.add(start)
    }
  }
  return [...out].sort((a, b) => a - b)
}

/** Every date the customer may book: today .. today + maxDaysAhead (Beirut). */
export const windowKeys = (rules: Rules, now: number): string[] =>
  Array.from({ length: rules.maxDaysAhead + 1 }, (_, i) => addDays(dateKey(now), i))

/** Intl locale the site uses (Arabic keeps Western digits). */
export const intlLocale = (locale: 'en' | 'ar') => (locale === 'ar' ? 'ar-LB-u-nu-latn' : 'en-US')

/** "Tuesday 20 October, 13:30" as the booking page should show it, computed independently. */
export const formatWhen = (instant: number, locale: 'en' | 'ar'): string => {
  const day = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(instant))
  return `${day}${locale === 'ar' ? '،' : ','} ${hhmm(instant)}`
}
