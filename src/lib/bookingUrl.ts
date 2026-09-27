/**
 * The booking page's address: which step the customer is on and her non-personal answers, so
 * browser Back / Forward and a refresh land on the same step. Safe for browser code.
 *
 *   step 1   /book
 *   step 2   /book?service=<slug>&step=time&date=2026-10-20
 *   step 3   /book?service=<slug>&step=details&date=2026-10-20&time=13:30
 *   request  /book?service=<slug>&step=details&requestedDate=2026-11-02&locationType=studio&people=2&trial=1
 *
 * `?service=<slug>` alone (every Book button on the site) means step 2. Names, phones, notes
 * and addresses are personal: they never go in the address (see BookingFlow's sessionStorage).
 */

export type StepKey = 'service' | 'time' | 'details'

export type RequestQuery = {
  requestedDate?: string
  locationType?: 'studio' | 'onLocation'
  peopleCount?: number
  wantsTrial?: boolean
}

export type BookingQuery = {
  service: string | null
  step: StepKey
  /** Beirut date key, "YYYY-MM-DD". */
  date: string | null
  /** Beirut clock time, "HH:mm". */
  time: string | null
  request: RequestQuery
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const SLUG = /^[a-z0-9-]{1,120}$/

/** Reads the query; anything malformed is dropped rather than trusted. */
export const parseBookingQuery = (get: (key: string) => string | null | undefined): BookingQuery => {
  const valid = (key: string, pattern: RegExp) => {
    const value = get(key)
    return value && pattern.test(value) ? value : null
  }
  const service = valid('service', SLUG)
  const step = get('step')
  const people = Number(get('people'))
  const locationType = get('locationType')
  const requestedDate = valid('requestedDate', DATE)

  return {
    service,
    step: !service ? 'service' : step === 'details' ? 'details' : 'time',
    date: valid('date', DATE),
    time: valid('time', TIME),
    request: {
      ...(requestedDate && { requestedDate }),
      ...((locationType === 'studio' || locationType === 'onLocation') && { locationType }),
      ...(Number.isInteger(people) && people >= 1 && people <= 50 && { peopleCount: people }),
      ...(get('trial') === '1' && { wantsTrial: true }),
    },
  }
}

/** The query string ("?..." or "") for a step and its answers. */
export const bookingSearch = (q: BookingQuery): string => {
  if (!q.service || q.step === 'service') return ''
  const params = new URLSearchParams({ service: q.service, step: q.step })
  if (q.date) params.set('date', q.date)
  if (q.time && q.step === 'details') params.set('time', q.time)
  const r = q.request
  if (r.requestedDate) params.set('requestedDate', r.requestedDate)
  if (r.locationType) params.set('locationType', r.locationType)
  if (r.peopleCount) params.set('people', String(r.peopleCount))
  if (r.wantsTrial) params.set('trial', '1')
  return `?${params.toString()}`
}
