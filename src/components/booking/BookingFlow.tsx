'use client'

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react'

import { getFreeSlots, submitBooking } from '@/app/(frontend)/[lang]/book/actions'
import { Icon } from '@/components/ui/Icon'
import { formatNodes, Ltr } from '@/components/ui/Ltr'
import { format, type Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { BookingField } from '@/lib/booking'
import { beirutToday, formatDay, formatTime, formatWhen } from '@/lib/bookingFormat'
import { bookingSearch, parseBookingQuery, type BookingQuery, type StepKey } from '@/lib/bookingUrl'
import { isValidPhone } from '@/lib/phoneFormat'
import type { DaySlots } from '@/lib/slots'
import { whatsappHref } from '@/lib/whatsapp'

import { BookingDone, type SentBooking } from './BookingDone'
import {
  describedBy,
  Field,
  inputClass,
  Notice,
  Step,
  type BookableService,
  type CustomerDetails,
  type RequestDetails,
} from './parts'
import { MAX_PEOPLE, RequestFields } from './RequestFields'
import { ServicePicker } from './ServicePicker'
import { SlotPicker, type SlotsState } from './SlotPicker'

type Errors = Partial<Record<BookingField, true>>
type NoticeState = { step: StepKey; text: string } | null

const REQUEST_FIELDS: BookingField[] = [
  'requestedDate',
  'locationType',
  'locationAddress',
  'peopleCount',
]

const emptyRequest: RequestDetails = {
  requestedDate: '',
  locationType: '',
  locationAddress: '',
  peopleCount: 1,
  wantsTrial: false,
}
const emptyDetails: CustomerDetails = { name: '', phone: '', notes: '' }
const PHONE_EXAMPLE = '03 123 456'

// ── History ──────────────────────────────────────────────────────────────────
// Every step is a history entry. Each entry carries `bookTrail` in history.state: the step
// numbers of this visit's booking entries, oldest first, ending with its own. A Change button
// uses it to go BACK to that step's entry (history.go) instead of adding one, so changing a
// time twice never adds Back presses. Next.js keeps its own keys next to ours.

const STEP_NO: Record<StepKey, number> = { service: 1, time: 2, details: 3 }

const trail = (): number[] => {
  const value = (window.history.state as { bookTrail?: unknown } | null)?.bookTrail
  return Array.isArray(value) ? value.filter((n): n is number => typeof n === 'number') : []
}
const pushEntry = (step: StepKey, search: string) =>
  window.history.pushState(
    { bookTrail: [...trail(), STEP_NO[step]] },
    '',
    window.location.pathname + search,
  )
/** Same entry, new address (a category link's #anchor is kept). */
const replaceEntry = (step: StepKey, search: string) =>
  window.history.replaceState(
    { bookTrail: [...trail().slice(0, -1), STEP_NO[step]] },
    '',
    window.location.pathname + search + window.location.hash,
  )

// ── Personal details ─────────────────────────────────────────────────────────
// Name, phone, notes and address never go in the address bar. They live in sessionStorage
// (this tab only) so Back / Forward and a refresh keep them, and are removed once sent.

const SAVED_KEY = 'book:details'
type Saved = CustomerDetails & { locationAddress: string }

const readSaved = (): Partial<Saved> => {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(SAVED_KEY) ?? '{}')
    if (!value || typeof value !== 'object') return {}
    const text = (key: keyof Saved) => {
      const v = (value as Record<string, unknown>)[key]
      return typeof v === 'string' ? v : undefined
    }
    return {
      name: text('name'),
      phone: text('phone'),
      notes: text('notes'),
      locationAddress: text('locationAddress'),
    }
  } catch {
    return {}
  }
}
const writeSaved = (saved: Saved) => {
  try {
    window.sessionStorage.setItem(SAVED_KEY, JSON.stringify(saved))
  } catch {
    // Storage blocked (private mode, settings): the form still works, just without it.
  }
}
const clearSaved = () => {
  try {
    window.sessionStorage.removeItem(SAVED_KEY)
  } catch {
    // Nothing stored, nothing to clear.
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** "13:30" (Beirut, as in the address) -> that day's free start time, if still offered. */
const findTime = (days: DaySlots[], date: string | null, hhmm: string | null): string | null =>
  (hhmm && days.find((d) => d.date === date)?.times.find((iso) => formatTime(iso, 'en') === hhmm)) ||
  null

const firstOpenDay = (days: DaySlots[], wanted: string | null): string | null => {
  const open = days.filter((d) => d.times.length > 0)
  return open.find((d) => d.date === wanted)?.date ?? open[0]?.date ?? null
}

/** Which request answers are missing or wrong. The address is checked only when asked. */
const requestErrors = (r: RequestDetails, withAddress: boolean): Errors => {
  const found: Errors = {}
  if (!r.requestedDate || r.requestedDate < beirutToday()) found.requestedDate = true
  if (!r.locationType) found.locationType = true
  if (withAddress && r.locationType === 'onLocation' && !r.locationAddress.trim()) {
    found.locationAddress = true
  }
  if (!(r.peopleCount >= 1 && r.peopleCount <= MAX_PEOPLE)) found.peopleCount = true
  return found
}

const isEmpty = (errors: Errors) => Object.keys(errors).length === 0

/**
 * Where a page load starts: the step and answers in the address, checked against the free
 * times the server sent with the page. A time that is no longer free lands on step 2, same
 * day, with a notice. The same on the server and in the browser (no hydration mismatch).
 */
const startingPoint = (
  service: BookableService | null,
  days: DaySlots[] | null,
  query: BookingQuery,
  b: Dictionary['booking'],
) => {
  const none = { date: null, time: null, request: emptyRequest, notice: null as NoticeState }
  if (!service) return { ...none, view: 'service' as StepKey }

  if (service.mode === 'request') {
    const request = { ...emptyRequest, ...query.request }
    const ready = query.step === 'details' && isEmpty(requestErrors(request, false))
    return { ...none, request, view: (ready ? 'details' : 'time') as StepKey }
  }

  if (!days) return { ...none, view: 'time' as StepKey }
  const date = firstOpenDay(days, query.date)
  const time = date === query.date ? findTime(days, date, query.time) : null
  const wantedDetails = query.step === 'details'
  return {
    ...none,
    date,
    time,
    view: (wantedDetails && time ? 'details' : 'time') as StepKey,
    notice: wantedDetails && !time ? { step: 'time' as StepKey, text: b.timeGoneAfterReload } : null,
  }
}

/**
 * The booking page's three steps: service, then a time (slot services) or the occasion's
 * details (request services), then name and phone. One step is open at a time; finished
 * steps fold into a line with a Change button.
 *
 * The browser only collects answers. Free times come from the server (getFreeSlots) and the
 * server re-checks everything when the booking is sent (submitBooking).
 */
export function BookingFlow({
  services,
  initialServiceId,
  initialDays,
  initialQuery,
  ownerName,
  whatsappNumber,
  maxDaysAhead,
  locale,
  t,
}: {
  services: BookableService[]
  initialServiceId: number | null
  /** Free times of the preselected slot service, loaded by the server with the page. */
  initialDays: DaySlots[] | null
  /** Step and answers read from the address (see lib/bookingUrl.ts). */
  initialQuery: BookingQuery
  ownerName: string
  whatsappNumber: string | null
  maxDaysAhead: number
  locale: Locale
  t: Dictionary
}) {
  const b = t.booking
  // Computed once, for the first render (useState's initializer runs only then).
  const [start] = useState(() =>
    startingPoint(
      services.find((s) => s.id === initialServiceId) ?? null,
      initialDays,
      initialQuery,
      b,
    ),
  )
  const [serviceId, setServiceId] = useState(initialServiceId)
  const service = services.find((s) => s.id === serviceId) ?? null
  const [view, setView] = useState<StepKey>(start.view)
  const [slots, setSlots] = useState<SlotsState>(
    initialDays
      ? { state: 'ready', days: initialDays }
      : // A preselected slot service whose times the server couldn't load: offer a retry.
        { state: initialServiceId ? 'error' : 'loading' },
  )
  const [date, setDate] = useState<string | null>(start.date)
  const [time, setTime] = useState<string | null>(start.time)
  const [request, setRequest] = useState<RequestDetails>(start.request)
  const [details, setDetails] = useState<CustomerDetails>(emptyDetails)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [notice, setNotice] = useState<NoticeState>(start.notice)
  const [sent, setSent] = useState<SentBooking | null>(null)
  const [sending, startSending] = useTransition()
  /** True once this booking was sent: Back to its old steps must never bring the form back. */
  const finished = useRef(false)

  const step: StepKey = service ? view : 'service'

  /** The address of a step, from the given answers (defaults: the current ones). */
  const searchFor = (
    at: StepKey,
    answers: {
      service?: BookableService | null
      date?: string | null
      time?: string | null
      request?: RequestDetails
    } = {},
  ): string => {
    const s = answers.service === undefined ? service : answers.service
    const r = answers.request ?? request
    const tm = answers.time === undefined ? time : answers.time
    return bookingSearch({
      service: s?.slug ?? null,
      step: at,
      date: s?.mode === 'slot' ? (answers.date === undefined ? date : answers.date) : null,
      time: s?.mode === 'slot' && tm ? formatTime(tm, 'en') : null,
      request:
        s?.mode === 'request'
          ? {
              requestedDate: r.requestedDate || undefined,
              locationType: r.locationType || undefined,
              peopleCount: r.peopleCount,
              wantsTrial: r.wantsTrial,
            }
          : {},
    })
  }

  /**
   * Back to an earlier step. When that step's history entry is behind this one, go back to it
   * (as the browser's Back would); otherwise (e.g. after a refresh) add an entry for it.
   */
  const goBackTo = (target: StepKey, search: string) => {
    setView(target)
    const steps = trail()
    for (let i = steps.length - 2; i >= 0; i--) {
      if (steps[i] === STEP_NO[target]) {
        window.history.go(i - (steps.length - 1))
        return
      }
    }
    pushEntry(target, search)
  }

  // ── Free times ────────────────────────────────────────────────────────────
  // Only the latest request may update the page (a quick change of service can
  // otherwise let an older answer arrive last).
  const latest = useRef(0)
  const fetchSlots = useCallback(
    async (id: number, keepDate: string | null, keepTime: string | null = null) => {
      const ticket = ++latest.current
      const result = await getFreeSlots(id).catch(() => ({ ok: false as const, reason: 'error' }))
      if (ticket !== latest.current) return
      if (!result.ok) {
        setSlots({ state: 'error' })
        return
      }
      setSlots({ state: 'ready', days: result.days })
      const day = firstOpenDay(result.days, keepDate)
      setDate(day)
      if (keepTime) {
        // Forward to a step 3 of another service: its time, if still free.
        const found = day === keepDate ? findTime(result.days, day, keepTime) : null
        setTime(found)
        if (found) setView('details')
        else setNotice({ step: 'time', text: b.timeGoneAfterReload })
      }
    },
    [b],
  )

  const reloadSlots = (id: number, keepDate: string | null, keepTime: string | null = null) => {
    setSlots({ state: 'loading' })
    void fetchSlots(id, keepDate, keepTime)
  }

  // ── Arrival, Back / Forward ───────────────────────────────────────────────
  const restored = useRef(false)

  // Keep the personal details for this tab (after they were restored, never before).
  useEffect(() => {
    if (restored.current) writeSaved({ ...details, locationAddress: request.locationAddress })
  }, [details, request.locationAddress])

  /** Brings the page in line with the address: after Back / Forward, or a cached remount. */
  const syncFromUrl = () => {
    const params = new URLSearchParams(window.location.search)
    const q = parseBookingQuery((key) => params.get(key))
    const next = services.find((s) => s.slug === q.service)
    if (!next) {
      // Step 1. The last chosen service stays checked.
      setView('service')
      return
    }

    if (next.id !== serviceId) {
      setServiceId(next.id)
      setErrors({})
      setNotice(null)
      setTime(null)
      if (next.mode === 'slot') {
        setView('time')
        setDate(q.date)
        reloadSlots(next.id, q.date, q.step === 'details' ? q.time : null)
      } else {
        const r = { ...emptyRequest, locationAddress: request.locationAddress, ...q.request }
        setRequest(r)
        setView(q.step === 'details' && isEmpty(requestErrors(r, true)) ? 'details' : 'time')
      }
      return
    }

    if (next.mode === 'request') {
      const r = { ...request, ...q.request }
      setRequest(r)
      setView(q.step === 'details' && isEmpty(requestErrors(r, true)) ? 'details' : 'time')
      return
    }

    const days = slots.state === 'ready' ? slots.days : null
    if (q.date && days?.some((d) => d.date === q.date && d.times.length > 0)) setDate(q.date)
    if (q.step !== 'details') {
      setView('time')
      return
    }
    const found = days
      ? findTime(days, q.date, q.time)
      : time && formatTime(time, 'en') === q.time
        ? time
        : null
    if (found) {
      setTime(found)
      setView('details')
    } else {
      setTime(null)
      setView('time')
      setNotice({ step: 'time', text: b.timeGoneAfterReload })
      replaceEntry('time', searchFor('time', { time: null }))
    }
  }

  const bookPath = useRef('')

  const arrive = useEffectEvent(() => {
    bookPath.current = window.location.pathname
    const saved = readSaved()
    restored.current = true
    setDetails({
      name: saved.name ?? '',
      phone: saved.phone ?? '',
      notes: saved.notes ?? '',
    })
    const address = saved.locationAddress ?? ''
    setRequest((r) => ({ ...r, locationAddress: address }))

    // Next.js can show this page from its cache for an address other than the one it was
    // first rendered for (Back into /book after following a link): follow the address.
    const params = new URLSearchParams(window.location.search)
    if (bookingSearch(parseBookingQuery((key) => params.get(key))) !== bookingSearch(initialQuery)) {
      syncFromUrl()
      return
    }

    // Mark this entry with its step, and write the address the page actually shows (a
    // time no longer free moved it from step 3 to step 2).
    replaceEntry(view, searchFor(view))
    // A request on location can't be on step 3 without its address.
    if (
      step === 'details' &&
      service?.mode === 'request' &&
      request.locationType === 'onLocation' &&
      !address.trim()
    ) {
      setView('time')
      setErrors({ locationAddress: true })
      replaceEntry('time', searchFor('time'))
    }
  })

  const startOver = () => {
    finished.current = false
    setSent(null)
    setServiceId(null)
    setView('service')
    setTime(null)
    setDate(null)
    setRequest(emptyRequest)
    setDetails(emptyDetails)
    setErrors({})
    setNotice(null)
  }

  /** The browser's Back or Forward landed on another entry of this page. */
  const onHistory = useEffectEvent(() => {
    // Leaving the booking page: Next.js takes care of it.
    if (window.location.pathname !== bookPath.current) return
    if (finished.current) {
      // An older step of a booking already sent: start fresh, and make this entry plain.
      startOver()
      window.history.replaceState({ bookTrail: [1] }, '', window.location.pathname)
      return
    }
    syncFromUrl()
  })

  useEffect(() => {
    // One tick later: Next.js installs its history handling in an effect of its own router,
    // which runs AFTER this one. Writing history.state before that would drop Next's keys,
    // and Back to this entry would then reload the whole page. (Also after hydration, so the
    // saved details never make the first render differ from the server's HTML.)
    const timer = window.setTimeout(() => arrive(), 0)
    const listener = () => onHistory()
    window.addEventListener('popstate', listener)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('popstate', listener)
    }
  }, [])

  // ── Moving between steps ──────────────────────────────────────────────────
  const headings = useRef<Partial<Record<StepKey, HTMLHeadingElement | null>>>({})
  // The step on screen, starting with the one the page loads on. Only a change of step
  // scrolls, never arrival: comparing (rather than a one-time "arrived" flag) also holds
  // when the effect runs twice for the same step, as React's StrictMode does in development.
  const shownStep = useRef(step)
  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    const heading = headings.current[step]
    if (!heading) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    heading.focus({ preventScroll: true })
    heading.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [step])

  const chooseService = (next: BookableService) => {
    const same = next.id === serviceId
    setServiceId(next.id)
    setView('time')
    setNotice(null)
    setErrors({})
    if (!same) {
      setTime(null)
      setDate(null)
      setRequest((r) => ({ ...emptyRequest, locationAddress: r.locationAddress }))
    }
    pushEntry(
      'time',
      searchFor('time', {
        service: next,
        date: same ? date : null,
        request: same ? request : emptyRequest,
      }),
    )
    if (next.mode === 'slot') reloadSlots(next.id, same ? date : null)
  }

  const chooseDay = (day: string) => {
    setDate(day)
    setNotice(null)
    // Same entry, so a refresh on step 2 keeps the day.
    replaceEntry('time', searchFor('time', { date: day }))
  }

  const chooseTime = (iso: string) => {
    setTime(iso)
    setNotice(null)
    setView('details')
    pushEntry('details', searchFor('details', { time: iso }))
  }

  const continueRequest = () => {
    const found = requestErrors(request, true)
    setErrors(found)
    if (!isEmpty(found)) return
    setView('details')
    // Step 2's entry keeps the answers too, so Back and a refresh there show them.
    replaceEntry('time', searchFor('time'))
    pushEntry('details', searchFor('details'))
  }

  // ── Sending ───────────────────────────────────────────────────────────────
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!service) return
    const found: Errors = {}
    if (details.name.trim().length < 2) found.name = true
    if (!isValidPhone(details.phone)) found.phone = true
    if (details.notes.length > 1000) found.notes = true
    setErrors(found)
    setNotice(null)
    if (!isEmpty(found)) return

    const isRequest = service.mode === 'request'
    startSending(async () => {
      const result = await submitBooking({
        serviceId: service.id,
        name: details.name,
        phone: details.phone,
        notes: details.notes,
        website: honeypot,
        ...(isRequest ? request : { startTime: time }),
      }).catch(() => ({ ok: false as const, reason: 'error' as const }))

      if (result.ok) {
        finished.current = true
        clearSaved()
        // This entry becomes a plain /book: Back can't bring the filled form or resend it.
        window.history.replaceState({ bookTrail: [1] }, '', window.location.pathname)
        setSent({
          service,
          startTime: isRequest ? null : time,
          request: isRequest ? request : null,
          details,
        })
        return
      }
      switch (result.reason) {
        case 'slotTaken':
        case 'slotGone':
          // Back to the times, freshly loaded, on the same day if it still has any.
          setTime(null)
          setNotice({ step: 'time', text: b[result.reason] })
          goBackTo('time', searchFor('time', { time: null }))
          reloadSlots(service.id, date)
          break
        case 'invalid':
          setErrors(Object.fromEntries(result.fields.map((f) => [f, true])))
          if (result.fields.some((f) => REQUEST_FIELDS.includes(f))) {
            goBackTo('time', searchFor('time'))
          }
          break
        case 'unavailable':
          setServiceId(null)
          setNotice({ step: 'service', text: b.unavailable })
          goBackTo('service', '')
          break
        case 'rateLimited':
          setNotice({ step: 'details', text: b.rateLimited })
          break
        default:
          setNotice({ step: 'details', text: b.failed })
      }
    })
  }

  if (sent) {
    return (
      <BookingDone
        sent={sent}
        ownerName={ownerName}
        whatsappNumber={whatsappNumber}
        onAnother={() => {
          startOver()
          window.history.replaceState({ bookTrail: [1] }, '', window.location.pathname)
        }}
        locale={locale}
        t={t}
      />
    )
  }

  const askHref = whatsappNumber ? whatsappHref(whatsappNumber, '') : null
  const stateOf = (key: StepKey) =>
    key === step ? 'open' : STEP_NO[key] < STEP_NO[step] ? 'done' : 'locked'
  const noticeFor = (key: StepKey) => (notice?.step === key ? <Notice>{notice.text}</Notice> : null)
  const phoneExample = { example: <Ltr>{PHONE_EXAMPLE}</Ltr> }

  // What step 2 decided, shown once the customer is past it.
  const timeSummary =
    step !== 'details'
      ? null
      : service?.mode === 'slot'
        ? time && formatWhen(time, locale)
        : [
            formatDay(request.requestedDate, locale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
            request.locationType === 'onLocation' ? b.onLocation : b.studio,
            `${b.summary.people}: ${request.peopleCount}`,
          ].join(' · ')

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <ol className="m-0 flex min-w-0 list-none flex-col gap-3 p-0 lg:col-span-7">
        <Step
          n={1}
          label={format(b.stepLabel, { n: 1 })}
          title={b.steps.service}
          state={stateOf('service')}
          summary={
            service && (
              <>
                {service.name} · <Ltr>{service.price}</Ltr>
              </>
            )
          }
          changeLabel={b.change}
          onChange={() => goBackTo('service', '')}
          headingRef={(el) => {
            headings.current.service = el
          }}
        >
          {noticeFor('service')}
          <ServicePicker
            services={services}
            selectedId={serviceId}
            onSelect={chooseService}
            t={t}
          />
        </Step>

        <Step
          n={2}
          label={format(b.stepLabel, { n: 2 })}
          title={service?.mode === 'request' ? b.steps.request : b.steps.time}
          state={stateOf('time')}
          summary={timeSummary}
          changeLabel={b.change}
          onChange={() => goBackTo('time', searchFor('time'))}
          headingRef={(el) => {
            headings.current.time = el
          }}
        >
          {noticeFor('time')}
          {service?.mode === 'slot' && (
            <SlotPicker
              slots={slots}
              date={date}
              time={time}
              onDate={chooseDay}
              onTime={chooseTime}
              onRetry={() => reloadSlots(service.id, date)}
              askHref={askHref}
              maxDaysAhead={maxDaysAhead}
              locale={locale}
              t={t}
            />
          )}
          {service?.mode === 'request' && (
            <RequestFields
              value={request}
              onChange={setRequest}
              errors={errors}
              today={beirutToday()}
              ownerName={ownerName}
              onContinue={continueRequest}
              t={t}
            />
          )}
        </Step>

        <Step
          n={3}
          label={format(b.stepLabel, { n: 3 })}
          title={b.steps.details}
          state={stateOf('details')}
          changeLabel={b.change}
          headingRef={(el) => {
            headings.current.details = el
          }}
        >
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <Field id="book-name" label={b.name} error={errors.name && b.errors.name}>
              <input
                id="book-name"
                autoComplete="name"
                maxLength={80}
                required
                value={details.name}
                onChange={(e) => setDetails({ ...details, name: e.target.value })}
                className={inputClass}
                {...describedBy('book-name', errors.name)}
              />
            </Field>
            <Field
              id="book-phone"
              label={b.phone}
              hint={formatNodes(b.phoneHint, phoneExample)}
              error={errors.phone && formatNodes(b.errors.phone, phoneExample)}
            >
              <input
                id="book-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder={PHONE_EXAMPLE}
                required
                value={details.phone}
                onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                className={`${inputClass} rtl:text-end`}
                {...describedBy('book-phone', errors.phone, b.phoneHint)}
              />
            </Field>
            <Field
              id="book-notes"
              label={b.notes}
              hint={b.notesHint}
              error={errors.notes && b.errors.notes}
            >
              <textarea
                id="book-notes"
                rows={3}
                maxLength={1000}
                value={details.notes}
                onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                className={`${inputClass} py-3`}
                {...describedBy('book-notes', errors.notes, b.notesHint)}
              />
            </Field>

            {/* Honeypot: invisible to people, tempting to bots. Filled in = not saved. */}
            <div aria-hidden className="absolute size-px overflow-hidden opacity-0">
              <label>
                Website
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </label>
            </div>

            {noticeFor('details')}

            <button
              type="submit"
              disabled={sending}
              className="inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 self-stretch rounded-full bg-clay px-6 text-[0.9375rem] font-semibold text-paper [transition:background-color_200ms_ease,scale_220ms_cubic-bezier(0.23,1,0.32,1)] hover:bg-clay-deep active:scale-[0.97] disabled:cursor-wait disabled:opacity-80 sm:self-start"
            >
              {sending ? b.sending : service?.mode === 'request' ? b.submitRequest : b.submitSlot}
              {!sending && <Icon name="arrow" size={18} />}
            </button>
            <p className="m-0 text-[0.8125rem] text-ink-soft">
              {format(b.pendingNote, { name: ownerName })}
            </p>
          </form>
        </Step>
      </ol>

      <aside className="hidden lg:col-span-4 lg:col-start-9 lg:block">
        <div className="sticky top-24 flex flex-col gap-4 rounded-card bg-paper p-7 shadow-soft">
          <p className="display m-0 text-[1.75rem]">{b.yourBooking}</p>
          {service ? (
            <dl className="m-0 flex flex-col">
              {[
                [b.summary.service, service.name],
                [b.summary.price, <Ltr key="price">{service.price}</Ltr>],
                [b.summary.duration, service.durationLabel],
                ...(timeSummary ? [[b.summary.when, timeSummary]] : []),
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="flex flex-col gap-0.5 border-t border-sand py-3 first:border-t-0"
                >
                  <dt className="text-[0.8125rem] text-ink-soft">{label}</dt>
                  <dd className="m-0 text-[0.9375rem] font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="m-0 text-[0.9375rem] text-ink-soft">{b.summaryEmpty}</p>
          )}
        </div>
      </aside>
    </div>
  )
}
