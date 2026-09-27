'use client'

import { useRef, useState } from 'react'

import { Picture } from '@/components/ui/Picture'
import type { Photo } from '@/lib/cms/home'

/**
 * A product's photos in one arch frame: swipe sideways (native scroll-snap, no carousel
 * library), or tap a dot. Works in both directions: in Arabic the first photo sits at the
 * right and the next one comes from the left, as the browser lays out an RTL row.
 * Without JavaScript the strip still scrolls; only the dots stay still.
 */
export function PhotoStrip({
  photos,
  name,
  labels,
}: {
  photos: Photo[]
  name: string
  labels: { region: string; photoOf: string; hint: string; soon: string }
}) {
  const track = useRef<HTMLUListElement>(null)
  const [current, setCurrent] = useState(0)
  const count = Math.max(photos.length, 1)

  // Which photo fills the frame. RTL scrollLeft counts down from 0, so use its size.
  const onScroll = () => {
    const el = track.current
    if (!el || el.clientWidth === 0) return
    setCurrent(Math.min(count - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth)))
  }

  const show = (i: number) => {
    const el = track.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Each photo is exactly one frame wide; in RTL the offsets run negative.
    const rtl = getComputedStyle(el).direction === 'rtl'
    el.scrollTo({ left: (rtl ? -1 : 1) * i * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
  }

  const label = (i: number) =>
    labels.photoOf.replace('{n}', String(i + 1)).replace('{total}', String(count))

  return (
    <div className="flex flex-col gap-3">
      <ul
        ref={track}
        onScroll={onScroll}
        aria-label={labels.region}
        className="no-scrollbar m-0 flex list-none snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-t-full rounded-b-[0.875rem] p-0 shadow-lift"
      >
        {(photos.length ? photos : [null]).map((photo, i) => (
          <li
            key={photo?.url ?? 'placeholder'}
            aria-label={photos.length > 1 ? label(i) : undefined}
            className="w-full shrink-0 snap-center snap-always"
          >
            <Picture
              photo={photo ? { ...photo, alt: photo.alt || name } : null}
              hint={labels.hint}
              soon={labels.soon}
              sizes="(min-width: 1024px) 34rem, 92vw"
              priority={i === 0}
              className="aspect-[4/5] w-full"
            />
          </li>
        ))}
      </ul>
      {photos.length > 1 && (
        <div className="flex justify-center gap-1">
          {photos.map((photo, i) => (
            <button
              key={photo.url}
              type="button"
              onClick={() => show(i)}
              aria-label={label(i)}
              aria-current={i === current ? 'true' : undefined}
              className="group flex size-11 items-center justify-center"
            >
              {/* The active dot stretches into a bar (scale only, no layout change). */}
              <span className="block h-2 w-6 scale-x-[0.34] rounded-full bg-stone transition-[scale,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-aria-[current=true]:scale-x-100 group-aria-[current=true]:bg-ink" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
