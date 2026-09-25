import { TZDate } from '@date-fns/tz'
import { addDays, format } from 'date-fns'

/** All customer-facing times are shown in this zone; the database stores UTC. */
export const BUSINESS_TIME_ZONE = 'Asia/Beirut'

export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export type Weekday = (typeof WEEKDAYS)[number]

/** "HH:mm", 24-hour clock, e.g. "09:30" or "18:00". */
export const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/

/** "09:30" -> 570 (minutes after midnight). */
export const minutesOfDay = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * The same instant, seen on a Beirut wall clock.
 * TZDate behaves like a normal Date, but getHours(), getDay() and date-fns
 * formatting all use Asia/Beirut instead of the server's own time zone.
 */
export const inBusinessZone = (date: Date | string | number): TZDate =>
  new TZDate(new Date(date).getTime(), BUSINESS_TIME_ZONE)

/** Calendar date in Beirut, "YYYY-MM-DD". */
export const businessDateKey = (date: Date | string | number): string =>
  format(inBusinessZone(date), 'yyyy-MM-dd')

/** Beirut calendar date `days` days after today. */
export const businessDateKeyFromToday = (days: number, now: Date = new Date()): string =>
  format(addDays(inBusinessZone(now), days), 'yyyy-MM-dd')
