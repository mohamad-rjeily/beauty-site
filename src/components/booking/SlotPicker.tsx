'use client'

import { useEffect, useRef } from 'react'

import { Icon } from '@/components/ui/Icon'
import { format, type Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import { formatDay, formatTime } from '@/lib/bookingFormat'
import type { DaySlots } from '@/lib/slots'

import { chipClass } from './parts'

export type SlotsState =
  { state: 'loading' } | { state: 'ready'; days: DaySlots[] } | { state: 'error' }

/**
 * Step 2 for time-slot services. A horizontal strip of days (small arches, easier on a phone
 * than a month grid; days without a free time are shown but can't be chosen), then the free
 * times of the chosen day. Everything comes from the server; the page never computes a slot.
 */
export function SlotPicker({
  slots,
  date,
  time,
  onDate,
  onTime,
  onRetry,
  askHref,
  maxDaysAhead,
  locale,
  t,
}: {
  slots: SlotsState
  date: string | null
  time: string | null
  onDate: (date: string) => void
  onTime: (time: string) => void
  onRetry: () => void
  askHref: string | null
  maxDaysAhead: number
  locale: Locale
  t: Dictionary
}) {
  const b = t.booking
  const strip = useRef<HTMLDivElement>(null)

  // Keep the chosen day in view inside the strip (never scrolls the page itself).
  useEffect(() => {
    const track = strip.current
    const tile = track?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!track || !tile) return
    const trackBox = track.getBoundingClientRect()
    const tileBox = tile.getBoundingClientRect()
    if (tileBox.left < trackBox.left || tileBox.right > trackBox.right) {
      // Line the tile up with the strip's reading start (left in English, right in Arabic).
      const rtl = getComputedStyle(track).direction === 'rtl'
      const delta = rtl ? tileBox.right - trackBox.right + 24 : tileBox.left - trackBox.left - 24
      track.scrollBy({ left: delta, behavior: 'instant' })
    }
  }, [date, slots.state])

  if (slots.state === 'loading') {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <p className="m-0 text-sm text-ink-soft" aria-live="polite">
          {b.loadingTimes}
        </p>
        <div className="flex gap-2 overflow-hidden" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              className="h-[5.75rem] w-[4.25rem] shrink-0 rounded-t-full rounded-b-lg bg-sand/70"
            />
          ))}
        </div>
      </div>
    )
  }

  if (slots.state === 'error') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 text-[0.9375rem]">{b.timesFailed}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-ink px-5 text-sm font-semibold transition-colors hover:bg-ink hover:text-paper"
        >
          {b.retry}
        </button>
      </div>
    )
  }

  const days = slots.days
  if (!days.some((d) => d.times.length > 0)) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="m-0 max-w-[34ch] text-[0.9375rem] leading-relaxed">
          {format(b.noTimes, { days: maxDaysAhead })}
        </p>
        {askHref && (
          <a
            href={askHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[3.25rem] items-center gap-2.5 rounded-full bg-sage px-6 text-[0.9375rem] font-semibold text-paper no-underline hover:bg-[#4d5946]"
          >
            <Icon name="whatsapp" size={20} /> {t.askOnWhatsApp}
          </a>
        )}
      </div>
    )
  }

  const chosen = days.find((d) => d.date === date)
  // Later days lie at the reading end: to the right in English, to the left in Arabic.
  const scrollDays = (towards: 1 | -1) => {
    const track = strip.current
    if (!track) return
    const dir = getComputedStyle(track).direction === 'rtl' ? -1 : 1
    track.scrollBy({ left: towards * dir * track.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p id="book-days" className="m-0 text-sm font-semibold">
            {b.days}
          </p>
          <div className="hidden gap-1 lg:flex">
            <button
              type="button"
              onClick={() => scrollDays(-1)}
              aria-label={b.earlierDays}
              className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-sand"
            >
              <Icon name="chevronStart" size={20} />
            </button>
            <button
              type="button"
              onClick={() => scrollDays(1)}
              aria-label={b.laterDays}
              className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-sand"
            >
              <Icon name="chevronEnd" size={20} />
            </button>
          </div>
        </div>
        <div
          ref={strip}
          role="group"
          aria-labelledby="book-days"
          className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto px-5 pt-1 pb-2 lg:-mx-8 lg:scroll-px-8 lg:px-8"
        >
          {days.map((day) => {
            const open = day.times.length > 0
            return (
              <button
                key={day.date}
                type="button"
                disabled={!open}
                // Styled by data-closed, not :disabled: the whole step is also disabled for a
                // moment while the page starts, and open days must not look closed then.
                data-closed={open ? undefined : ''}
                aria-pressed={day.date === date}
                onClick={() => onDate(day.date)}
                className="flex h-[5.75rem] w-[4.25rem] shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-t-full rounded-b-lg border border-line bg-paper-bright pt-2 text-ink transition-[background-color,border-color,color,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-ink active:scale-[0.96] data-closed:cursor-default data-closed:border-transparent data-closed:bg-transparent data-closed:text-stone data-closed:hover:border-transparent data-closed:active:scale-100 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
              >
                <span className="text-[0.6875rem] font-semibold">
                  {formatDay(day.date, locale, { weekday: 'short' })}
                </span>
                <span className="font-display text-[1.625rem] leading-none tabular-nums">
                  {formatDay(day.date, locale, { day: 'numeric' })}
                </span>
                <span className="text-[0.6875rem]">
                  {formatDay(day.date, locale, { month: 'short' })}
                </span>
                {!open && <span className="sr-only">{b.fullyBooked}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {chosen && (
        <div key={chosen.date} className="motion-fade flex flex-col gap-3">
          <p id="book-times" className="m-0 text-sm font-semibold">
            {format(b.timesOn, {
              date: formatDay(chosen.date, locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }),
            })}
          </p>
          <div
            role="group"
            aria-labelledby="book-times"
            className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5"
          >
            {chosen.times.map((iso) => (
              <button
                key={iso}
                type="button"
                aria-pressed={iso === time}
                onClick={() => onTime(iso)}
                className={`${chipClass} tabular-nums`}
              >
                {formatTime(iso, locale)}
              </button>
            ))}
          </div>
          <p className="m-0 text-[0.8125rem] text-ink-soft">{b.beirutTime}</p>
        </div>
      )}
    </div>
  )
}
