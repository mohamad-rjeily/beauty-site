'use client'

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from 'react'

import { getFreeSlots, submitBooking } from '@/app/(frontend)/[lang]/book/actions'
import { Icon } from '@/components/ui/Icon'
import { format, type Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { BookingField } from '@/lib/booking'
import { beirutToday, formatDay, formatWhen } from '@/lib/bookingFormat'
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

type StepKey = 'service' | 'time' | 'details'
type Errors = Partial<Record<BookingField, true>>

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
  ownerName: string
  whatsappNumber: string | null
  maxDaysAhead: number
  locale: Locale
  t: Dictionary
}) {
  const b = t.booking
  const [serviceId, setServiceId] = useState(initialServiceId)
  const service = services.find((s) => s.id === serviceId) ?? null
  const [slots, setSlots] = useState<SlotsState>(
    initialDays
      ? { state: 'ready', days: initialDays }
      : // A preselected slot service whose times the server couldn't load: offer a retry.
        { state: initialServiceId ? 'error' : 'loading' },
  )
  const [date, setDate] = useState<string | null>(
    initialDays?.find((d) => d.times.length > 0)?.date ?? null,
  )
  const [time, setTime] = useState<string | null>(null)
  const [request, setRequest] = useState<RequestDetails>(emptyRequest)
  const [requestReady, setRequestReady] = useState(false)
  const [details, setDetails] = useState<CustomerDetails>({ name: '', phone: '', notes: '' })
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [notice, setNotice] = useState<{ step: StepKey; text: string } | null>(null)
  const [sent, setSent] = useState<SentBooking | null>(null)
  const [sending, startSending] = useTransition()

  const step: StepKey = !service
    ? 'service'
    : (service.mode === 'slot' ? time : requestReady)
      ? 'details'
      : 'time'

  // ── Free times ────────────────────────────────────────────────────────────
  // Only the latest request may update the page (a quick change of service can
  // otherwise let an older answer arrive last).
  const latest = useRef(0)
  const fetchSlots = useCallback(async (id: number, keepDate: string | null) => {
    const ticket = ++latest.current
    const result = await getFreeSlots(id).catch(() => ({ ok: false as const, reason: 'error' }))
    if (ticket !== latest.current) return
    if (!result.ok) {
      setSlots({ state: 'error' })
      return
    }
    setSlots({ state: 'ready', days: result.days })
    const open = result.days.filter((d) => d.times.length > 0)
    setDate(open.find((d) => d.date === keepDate)?.date ?? open[0]?.date ?? null)
  }, [])

  const reloadSlots = (id: number, keepDate: string | null) => {
    setSlots({ state: 'loading' })
    void fetchSlots(id, keepDate)
  }

  // ── Moving between steps ──────────────────────────────────────────────────
  const headings = useRef<Partial<Record<StepKey, HTMLHeadingElement | null>>>({})
  const arrived = useRef(false)
  useEffect(() => {
    // Not on arrival: only when the customer moves on, bring the new step into view.
    if (!arrived.current) {
      arrived.current = true
      return
    }
    const heading = headings.current[step]
    if (!heading) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    heading.focus({ preventScroll: true })
    heading.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [step])

  const chooseService = (next: BookableService) => {
    setServiceId(next.id)
    setTime(null)
    setDate(null)
    setRequestReady(false)
    setNotice(null)
    setErrors({})
    // Keep the choice in the address, so a reload or a shared link opens the same service.
    window.history.replaceState(null, '', `?service=${encodeURIComponent(next.slug)}`)
    if (next.mode === 'slot') reloadSlots(next.id, null)
  }

  const continueRequest = () => {
    const found: Errors = {}
    if (!request.requestedDate || request.requestedDate < beirutToday()) found.requestedDate = true
    if (!request.locationType) found.locationType = true
    if (request.locationType === 'onLocation' && !request.locationAddress.trim()) {
      found.locationAddress = true
    }
    if (!(request.peopleCount >= 1 && request.peopleCount <= MAX_PEOPLE)) found.peopleCount = true
    setErrors(found)
    if (Object.keys(found).length === 0) setRequestReady(true)
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
    if (Object.keys(found).length > 0) return

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
          reloadSlots(service.id, date)
          break
        case 'invalid':
          setErrors(Object.fromEntries(result.fields.map((f) => [f, true])))
          if (result.fields.some((f) => REQUEST_FIELDS.includes(f))) setRequestReady(false)
          break
        case 'unavailable':
          setServiceId(null)
          setNotice({ step: 'service', text: b.unavailable })
          break
        case 'rateLimited':
          setNotice({ step: 'details', text: b.rateLimited })
          break
        default:
          setNotice({ step: 'details', text: b.failed })
      }
    })
  }

  const startOver = () => {
    setSent(null)
    setServiceId(null)
    setTime(null)
    setDate(null)
    setRequest(emptyRequest)
    setRequestReady(false)
    setDetails((d) => ({ ...d, notes: '' }))
    setErrors({})
    window.history.replaceState(null, '', window.location.pathname)
  }

  if (sent) {
    return (
      <BookingDone
        sent={sent}
        ownerName={ownerName}
        whatsappNumber={whatsappNumber}
        onAnother={startOver}
        locale={locale}
        t={t}
      />
    )
  }

  const askHref = whatsappNumber ? whatsappHref(whatsappNumber, '') : null
  const stateOf = (key: StepKey, order: number) => {
    const current = step === 'service' ? 0 : step === 'time' ? 1 : 2
    return key === step ? 'open' : order < current ? 'done' : 'locked'
  }
  const noticeFor = (key: StepKey) => (notice?.step === key ? <Notice>{notice.text}</Notice> : null)

  const timeSummary =
    service?.mode === 'slot'
      ? time && formatWhen(time, locale)
      : requestReady &&
        [
          formatDay(request.requestedDate, locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          request.locationType === 'onLocation' ? b.onLocation : b.studio,
          `${b.summary.people}: ${request.peopleCount}`,
        ].join(' · ')

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <ol className="m-0 flex list-none flex-col gap-3 p-0 lg:col-span-7">
        <Step
          n={1}
          label={format(b.stepLabel, { n: 1 })}
          title={b.steps.service}
          state={stateOf('service', 0)}
          summary={service && `${service.name} · ${service.price}`}
          changeLabel={b.change}
          onChange={() => setServiceId(null)}
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
          state={stateOf('time', 1)}
          summary={timeSummary}
          changeLabel={b.change}
          onChange={() => (service?.mode === 'slot' ? setTime(null) : setRequestReady(false))}
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
              onDate={(d) => {
                setDate(d)
                setNotice(null)
              }}
              onTime={(iso) => {
                setTime(iso)
                setNotice(null)
              }}
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
          state={stateOf('details', 2)}
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
              hint={b.phoneHint}
              error={errors.phone && b.errors.phone}
            >
              <input
                id="book-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder="+961 3 123 456"
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
                [b.summary.price, service.price],
                [b.summary.duration, service.durationLabel],
                ...(timeSummary ? [[b.summary.when, timeSummary]] : []),
              ].map(([label, value]) => (
                <div
                  key={label}
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
