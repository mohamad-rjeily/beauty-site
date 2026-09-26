import { TZDate } from '@date-fns/tz'

import type { Availability } from '@/payload-types'

import {
  BUSINESS_TIME_ZONE,
  businessDateKey,
  businessDateKeyFromToday,
  minutesOfDay,
  WEEKDAYS,
  type Weekday,
} from './time'

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE

/**
 * The booking rules shared by the booking hook (which refuses a bad time) and the booking
 * page (which only offers good ones). Both use these functions, so the page can never offer
 * a time the hook would then refuse.
 */
export type BookingRules = Pick<
  Availability,
  | 'weeklyHours'
  | 'blockedDates'
  | 'slotIntervalMinutes'
  | 'bufferMinutes'
  | 'minNoticeHours'
  | 'maxDaysAhead'
>

/** Time a booking keeps the calendar busy: [start, occupiedUntil), the break included. */
export type BusyRange = { start: Date | string; until: Date | string }

/** True when a Beirut date ("YYYY-MM-DD") falls in one of the owner's closed periods. */
export const isClosedDate = (
  dateKey: string,
  blockedDates: BookingRules['blockedDates'],
): boolean =>
  (blockedDates ?? []).some((b) => {
    const from = businessDateKey(b.from)
    const to = b.to ? businessDateKey(b.to) : from
    return dateKey >= from && dateKey <= to
  })

/**
 * Where an appointment from `startMinute` to `endMinute` (minutes after Beirut midnight)
 * stands against the working hours of that weekday:
 * - `outside`: no single working range holds the whole appointment
 * - `offStep`: it fits, but doesn't start on the range's start-time step (10:00, 10:30...)
 * - `ok`
 */
export const checkWorkingHours = (
  rules: Pick<BookingRules, 'weeklyHours' | 'slotIntervalMinutes'>,
  weekday: Weekday,
  startMinute: number,
  endMinute: number,
): { result: 'ok' | 'offStep' | 'outside'; opens?: string } => {
  const range = (rules.weeklyHours ?? []).find(
    (r) =>
      r.day === weekday &&
      minutesOfDay(r.opens) <= startMinute &&
      endMinute <= minutesOfDay(r.closes),
  )
  if (!range) return { result: 'outside' }
  const onStep = (startMinute - minutesOfDay(range.opens)) % rules.slotIntervalMinutes === 0
  return { result: onStep ? 'ok' : 'offStep', opens: range.opens }
}

/** True when [start, occupiedUntil) touches any busy range. Back-to-back is allowed. */
export const overlapsBusy = (start: Date, occupiedUntil: Date, busy: BusyRange[]): boolean =>
  busy.some(
    (b) =>
      new Date(b.start).getTime() < occupiedUntil.getTime() &&
      new Date(b.until).getTime() > start.getTime(),
  )

/**
 * A Beirut wall-clock time on a Beirut date, as a real instant. Returns null when that time
 * doesn't exist on that day (the hour skipped when daylight saving starts).
 */
export const businessTime = (dateKey: string, minuteOfDay: number): Date | null => {
  const [y, m, d] = dateKey.split('-').map(Number)
  const hours = Math.floor(minuteOfDay / 60)
  const minutes = minuteOfDay % 60
  const zoned = new TZDate(y, m - 1, d, hours, minutes, 0, BUSINESS_TIME_ZONE)
  if (zoned.getHours() !== hours || zoned.getMinutes() !== minutes) return null
  return new Date(zoned.getTime())
}

/** Weekday of a Beirut date ("YYYY-MM-DD"). Noon avoids any midnight clock change. */
export const weekdayOf = (dateKey: string): Weekday => {
  const [y, m, d] = dateKey.split('-').map(Number)
  return WEEKDAYS[new TZDate(y, m - 1, d, 12, 0, 0, BUSINESS_TIME_ZONE).getDay()]
}

/** The Beirut dates customers may book: today up to `maxDaysAhead` days later. */
export const bookableDateKeys = (maxDaysAhead: number, now: Date = new Date()): string[] =>
  Array.from({ length: maxDaysAhead + 1 }, (_, i) => businessDateKeyFromToday(i, now))

export type DaySlots = {
  /** Beirut date, "YYYY-MM-DD". */
  date: string
  /** Free start times, UTC ISO strings, earliest first. */
  times: string[]
}

/**
 * Every free start time for a service of `durationMinutes`, per Beirut date, over the whole
 * booking window. A start is free when:
 * - the date is inside the window (today .. today + maxDaysAhead) and not closed
 * - the whole appointment fits inside one working range and starts on its step
 * - it is at least `minNoticeHours` from now
 * - [start, end + break) doesn't touch any existing booking's [start, occupiedUntil)
 *
 * All wall-clock maths is done in Asia/Beirut, so daylight-saving changes move the UTC
 * instants, never the local times.
 */
export const freeSlots = ({
  rules,
  busy,
  durationMinutes,
  now = new Date(),
}: {
  rules: BookingRules
  busy: BusyRange[]
  durationMinutes: number
  now?: Date
}): DaySlots[] => {
  const earliest = now.getTime() + rules.minNoticeHours * HOUR

  return bookableDateKeys(rules.maxDaysAhead, now).map((date) => {
    if (isClosedDate(date, rules.blockedDates)) return { date, times: [] }

    const weekday = weekdayOf(date)
    const starts = new Set<number>()
    for (const range of rules.weeklyHours ?? []) {
      if (range.day !== weekday) continue
      const closes = minutesOfDay(range.closes)
      for (
        let minute = minutesOfDay(range.opens);
        minute + durationMinutes <= closes;
        minute += rules.slotIntervalMinutes
      ) {
        // Same rule the hook applies (overlapping ranges are resolved identically).
        if (checkWorkingHours(rules, weekday, minute, minute + durationMinutes).result !== 'ok') {
          continue
        }
        const start = businessTime(date, minute)
        if (!start || start.getTime() < earliest) continue
        const end = new Date(start.getTime() + durationMinutes * MINUTE)
        if (businessDateKey(end) !== date) continue
        const occupiedUntil = new Date(end.getTime() + rules.bufferMinutes * MINUTE)
        if (overlapsBusy(start, occupiedUntil, busy)) continue
        starts.add(start.getTime())
      }
    }

    return {
      date,
      times: [...starts].sort((a, b) => a - b).map((t) => new Date(t).toISOString()),
    }
  })
}
