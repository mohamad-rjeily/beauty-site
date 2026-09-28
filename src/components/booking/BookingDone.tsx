'use client'

import { useEffect, useRef } from 'react'

import { Emphasis } from '@/components/home/shared'
import { Icon } from '@/components/ui/Icon'
import { Ltr } from '@/components/ui/Ltr'
import { PillLink } from '@/components/ui/Pill'
import { format, type Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import { formatDay, formatWhen } from '@/lib/bookingFormat'
import { formatPhone } from '@/lib/format'
import { normalizePhone } from '@/lib/phoneFormat'
import { whatsappHref } from '@/lib/whatsapp'

import type { BookableService, CustomerDetails, RequestDetails } from './parts'

export type SentBooking = {
  service: BookableService
  startTime: string | null
  request: RequestDetails | null
  details: CustomerDetails
}

/** The summary rows, shared by the screen and the WhatsApp message. */
const summaryRows = (sent: SentBooking, locale: Locale, t: Dictionary): [string, string][] => {
  const s = t.booking.summary
  const rows: [string, string][] = [
    [s.service, sent.service.name],
    [s.price, sent.service.price],
  ]
  if (sent.startTime) {
    rows.push([s.when, formatWhen(sent.startTime, locale)])
  }
  if (sent.request) {
    const r = sent.request
    rows.push([
      s.date,
      formatDay(r.requestedDate, locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    ])
    const where = r.locationType === 'onLocation' ? t.booking.onLocation : t.booking.studio
    rows.push([s.where, r.locationType === 'onLocation' ? `${where}: ${r.locationAddress}` : where])
    rows.push([s.people, String(r.peopleCount)])
    rows.push([s.trial, r.wantsTrial ? t.booking.yes : t.booking.no])
  }
  // The number as it was saved ("03 123 456" -> "+961 3 123 456").
  rows.push([s.name, sent.details.name.trim()], [s.phone, formatPhone(normalizePhone(sent.details.phone))])
  if (sent.details.notes.trim()) rows.push([s.notes, sent.details.notes.trim()])
  return rows
}

/** The pre-filled WhatsApp message to the owner, in the page's language. */
const whatsappMessage = (sent: SentBooking, locale: Locale, t: Dictionary): string =>
  [
    sent.request ? t.booking.whatsappIntroRequest : t.booking.whatsappIntroSlot,
    '',
    ...summaryRows(sent, locale, t).map(([label, value]) => `• ${label}: ${value}`),
    '',
    t.booking.whatsappOutro,
  ].join('\n')

/**
 * After sending: what was booked, its status (pending until she confirms), and, as the main
 * action, sending the same summary to her on WhatsApp. Until email notifications exist that
 * message is how she learns about a booking quickly; the booking is saved either way.
 */
export function BookingDone({
  sent,
  ownerName,
  whatsappNumber,
  onAnother,
  locale,
  t,
}: {
  sent: SentBooking
  ownerName: string
  whatsappNumber: string | null
  onAnother: () => void
  locale: Locale
  t: Dictionary
}) {
  const b = t.booking
  const heading = useRef<HTMLHeadingElement>(null)
  const rows = summaryRows(sent, locale, t)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    heading.current?.scrollIntoView({ block: 'start' })
  }, [])

  return (
    <div className="motion-step grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="flex flex-col items-start gap-5 lg:col-span-6">
        <h2
          ref={heading}
          tabIndex={-1}
          className="display m-0 scroll-mt-24 text-[3rem] outline-none lg:text-[4.5rem]"
        >
          <Emphasis text={sent.request ? b.doneRequest : b.doneSlot} className="text-clay" />
        </h2>
        <p className="m-0 inline-flex items-center gap-2 rounded-full bg-clay-mist px-3.5 py-1.5 text-[0.8125rem] font-semibold text-clay-deep">
          <Icon name="clock" size={16} />
          {format(b.pending, { name: ownerName })}
        </p>

        {whatsappNumber && (
          <div className="mt-2 flex w-full flex-col items-start gap-4">
            <p className="m-0 max-w-[30ch] font-display text-[1.375rem] leading-snug font-light lg:text-[1.75rem]">
              {format(b.whatsappLead, { name: ownerName })}
            </p>
            <PillLink
              href={whatsappHref(whatsappNumber, whatsappMessage(sent, locale, t))}
              external
              variant="sage"
              className="w-full sm:w-auto"
            >
              <Icon name="whatsapp" size={20} /> {b.sendOnWhatsApp}
            </PillLink>
            <p className="m-0 text-[0.8125rem] text-ink-soft">{b.savedEither}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onAnother}
          className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline decoration-1 underline-offset-4 hover:text-clay-deep"
        >
          {b.bookAnother}
        </button>
      </div>

      <dl className="m-0 flex flex-col self-start rounded-card bg-paper px-5 py-2 shadow-soft lg:col-span-5 lg:col-start-8 lg:px-7">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col gap-0.5 border-t border-sand py-3.5 first:border-t-0"
          >
            <dt className="text-[0.8125rem] text-ink-soft">{label}</dt>
            <dd className="m-0 text-[0.9375rem] font-semibold break-words">
              {label === t.booking.summary.phone || label === t.booking.summary.price ? (
                <Ltr>{value}</Ltr>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
