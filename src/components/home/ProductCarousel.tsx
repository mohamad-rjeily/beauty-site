'use client'

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'

import { Icon } from '@/components/ui/Icon'

type Labels = { region: string; previous: string; next: string; slideOf: string }

/** Scale and opacity by distance from the centre card; the last entry is the off-stage slot. */
const SCALE = [1, 0.88, 0.78, 0.7]
const OPACITY = [1, 0.7, 0.4, 0]
const REACH = SCALE.length - 1
/** Visible gap between neighbouring cards, whatever their scale. */
const GAP_PX = 14

const mod = (n: number, m: number) => ((n % m) + m) % m

/** "Product {n} of {total}" for the zero-based slide `i`. */
const slideLabel = (template: string, i: number, total: number) =>
  template.replace('{n}', String(i + 1)).replace('{total}', String(total))

/**
 * Where the card `d` places from the centre sits, as a percentage of its own width plus
 * pixels. Distances add up half-widths of the scaled cards on both sides, so the gaps stay
 * equal while the cards shrink. `flat` is the unscaled layout used under reduced motion.
 */
const place = (d: number, dir: 1 | -1) => {
  const steps = Math.abs(d)
  let widths = 0
  for (let k = 1; k <= steps; k++) widths += (SCALE[k - 1] + SCALE[k]) / 2
  const sign = Math.sign(d) * dir
  return {
    '--x': `calc(${sign * widths * 100}% + ${sign * steps * GAP_PX}px)`,
    '--x-flat': `calc(${sign * steps * 100}% + ${sign * steps * GAP_PX}px)`,
    '--s': SCALE[steps],
    '--a': OPACITY[steps],
  } as CSSProperties
}

/**
 * Looping product carousel. The centre card is full size; the ones beside it are smaller and
 * softer. Swipe or drag, the arrow buttons (desktop) or the keyboard arrows move it; nothing
 * moves on its own.
 *
 * How the loop works: the index grows without limit, and the cards on stage are the
 * positions index-3 … index+3, keyed by that absolute position (the product is position mod
 * count). Moving on shifts every key one place; a card that falls off one edge simply
 * unmounts while invisible, and a new one mounts invisible on the other edge, so no card
 * ever flies across the stage.
 *
 * Motion is plain CSS (globals.css, .carousel-slide): each card's place, scale and opacity
 * are custom properties, and only transform and opacity transition, on a spring curve.
 * While a finger drags, one --drag variable on the track moves every card with it.
 */
export function ProductCarousel({
  slides,
  labels,
  rtl,
}: {
  slides: ReactNode[]
  labels: Labels
  rtl: boolean
}) {
  const total = slides.length
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; t: number; dx: number; id: number } | null>(null)
  const dragged = useRef(false)
  const dir = rtl ? -1 : 1
  const current = mod(index, total)

  const go = (step: number) => setIndex((i) => i + step)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (total < 2 || event.button !== 0) return
    drag.current = { x: event.clientX, t: event.timeStamp, dx: 0, id: event.pointerId }
    dragged.current = false
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    const el = track.current
    if (!state || !el) return
    state.dx = event.clientX - state.x
    if (!dragged.current && Math.abs(state.dx) > 8) {
      dragged.current = true
      el.dataset.dragging = ''
      el.setPointerCapture(state.id)
    }
    if (dragged.current) el.style.setProperty('--drag', `${state.dx}px`)
  }

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    const el = track.current
    drag.current = null
    if (!state || !el || !dragged.current) return
    delete el.dataset.dragging
    el.style.setProperty('--drag', '0px')
    const width = el.querySelector<HTMLElement>('[data-centre]')?.offsetWidth ?? 220
    const velocity = Math.abs(state.dx) / Math.max(event.timeStamp - state.t, 1) // px per ms
    // A quarter of a card, or a quick flick, turns it one card.
    if (Math.abs(state.dx) > width / 4 || (Math.abs(state.dx) > 24 && velocity > 0.4)) {
      const forward = rtl ? state.dx > 0 : state.dx < 0
      go(forward ? 1 : -1)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const towardsEnd = event.key === 'ArrowRight' ? !rtl : rtl
    go(towardsEnd ? 1 : -1)
  }

  const offsets = total > 1 ? Array.from({ length: REACH * 2 + 1 }, (_, i) => i - REACH) : [0]

  return (
    <div className="flex flex-col gap-6">
      <div
        ref={track}
        role="region"
        aria-roledescription="carousel"
        aria-label={labels.region}
        tabIndex={total > 1 ? 0 : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          // The click that ends a drag must not also open a link.
          if (!dragged.current) return
          dragged.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
        className="grid touch-pan-y select-none rounded-card [--drag:0px]"
      >
        {offsets.map((d) => {
          const position = index + d
          const centre = d === 0
          return (
            <div
              key={position}
              data-centre={centre || undefined}
              {...(centre
                ? {
                    role: 'group',
                    'aria-roledescription': 'slide',
                    'aria-label': slideLabel(labels.slideOf, mod(position, total), total),
                  }
                : // Side cards are scenery: hidden from screen readers, and their content is
                  // inert (not focusable). Tapping one brings it forward; the wrapper stays
                  // clickable because only its content is inert.
                  { 'aria-hidden': true, onClick: () => go(d) })}
              style={place(d, dir)}
              className={`carousel-slide w-[13.75rem] justify-self-center [grid-area:1/1] lg:w-[16.5rem] ${centre ? 'z-10' : 'cursor-pointer'}`}
            >
              <div inert={!centre} className="h-full">
                {slides[mod(position, total)]}
              </div>
            </div>
          )
        })}
      </div>

      {total > 1 && (
        <div className="hidden items-center justify-center gap-4 lg:flex">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={labels.previous}
            className="flex size-12 items-center justify-center rounded-full border-[1.5px] border-ink text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            <Icon name="chevronStart" size={18} />
          </button>
          <span
            aria-hidden="true"
            className="min-w-12 text-center text-sm tabular-nums text-ink-soft"
          >
            {current + 1} / {total}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={labels.next}
            className="flex size-12 items-center justify-center rounded-full bg-ink text-paper transition-colors hover:bg-earth"
          >
            <Icon name="chevronEnd" size={18} />
          </button>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {slideLabel(labels.slideOf, current, total)}
      </p>
    </div>
  )
}
