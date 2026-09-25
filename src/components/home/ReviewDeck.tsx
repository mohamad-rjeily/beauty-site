'use client'

import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'

import { Icon, Star } from '@/components/ui/Icon'
import type { Review } from '@/lib/cms/home'

type Labels = { previous: string; next: string; reviewOf: string; stars: string }

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))

/**
 * Reviews as a stack of paper cards. Arrows or a horizontal swipe move to the next card:
 * the front card slides off with a slight rotation and the next settles from the stack on a
 * spring. Direction follows the reading direction in Arabic. Reduced motion: a plain fade.
 */
export function ReviewDeck({
  reviews,
  labels,
  rtl,
}: {
  reviews: Review[]
  labels: Labels
  rtl: boolean
}) {
  const [[index, direction], setState] = useState<[number, 1 | -1]>([0, 1])
  const reduced = useReducedMotion()
  const start = useRef<{ x: number; t: number } | null>(null)
  const total = reviews.length
  const review = reviews[index]

  const go = (step: 1 | -1) => setState(([i]) => [(i + step + total) % total, step])
  const out = (step: number) => (rtl ? -step : step)

  // Full transform strings (not x/y/scale shorthands) keep the springs on the compositor.
  // The exit is a function variant so it reads the CURRENT direction through `custom`:
  // after Next then Previous, the old card leaves on the correct side.
  const variants = {
    enter: reduced ? { opacity: 0 } : { opacity: 0, transform: 'translateY(12px) scale(0.97)' },
    // The resting state is rendered on the server, where reduced motion is unknown: it must be
    // identical either way, or hydration mismatches. Only enter/exit depend on the preference.
    center: { opacity: 1, transform: 'translateX(0px) translateY(0px) scale(1) rotate(0deg)' },
    exit: (step: 1 | -1) =>
      reduced
        ? { opacity: 0 }
        : {
            opacity: 0,
            transform: `translateX(${out(-step * 160)}px) rotate(${out(-step * 6)}deg)`,
          },
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex flex-col gap-6">
        <div
          className="relative min-h-[17rem] touch-pan-y"
          onPointerDown={(event) => (start.current = { x: event.clientX, t: event.timeStamp })}
          onPointerUp={(event) => {
            if (start.current === null || total < 2) return
            const delta = event.clientX - start.current.x
            const velocity = Math.abs(delta) / Math.max(event.timeStamp - start.current.t, 1)
            start.current = null
            // A long drag or a quick flick both count.
            if (Math.abs(delta) < 48 && !(Math.abs(delta) > 16 && velocity > 0.11)) return
            const forward = rtl ? delta > 0 : delta < 0
            go(forward ? 1 : -1)
          }}
        >
          {total > 1 && (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-2.5 rotate-[4deg] rounded-card bg-[#efe7db] shadow-soft"
              />
              <div
                aria-hidden="true"
                className="absolute inset-1.5 -rotate-3 rounded-card bg-[#f3ece1] shadow-soft"
              />
            </>
          )}
          <div aria-live="polite" className="relative min-h-[17rem]">
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <m.figure
                key={review.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={
                  reduced
                    ? { duration: 0.2 }
                    : { type: 'spring', stiffness: 260, damping: 28, mass: 0.8 }
                }
                aria-label={fill(labels.reviewOf, { n: index + 1, total })}
                className="absolute inset-0 m-0 flex flex-col gap-3.5 rounded-card bg-paper p-6 shadow-lift"
              >
                {review.rating ? (
                  <div
                    role="img"
                    aria-label={fill(labels.stars, { n: review.rating })}
                    className="flex gap-0.5 text-clay-deep"
                  >
                    {Array.from({ length: review.rating }, (_, i) => (
                      <Star key={i} />
                    ))}
                  </div>
                ) : null}
                <blockquote className="m-0 flex-1 font-display text-[1.375rem] leading-snug font-light text-ink">
                  “{review.quote}”
                </blockquote>
                <figcaption className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{review.name}</span>
                  {review.context && (
                    <span className="text-xs text-ink-soft">{review.context}</span>
                  )}
                </figcaption>
              </m.figure>
            </AnimatePresence>
          </div>
        </div>

        {total > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center" aria-hidden="true">
              {reviews.map((r, i) => (
                <span
                  key={r.id}
                  className={`h-1.5 w-6 rounded-full transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${i === index ? 'scale-x-100 bg-ink' : 'scale-x-25 bg-stone'}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={labels.previous}
                className="flex size-12 items-center justify-center rounded-full border-[1.5px] border-ink text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                <Icon name="chevronStart" size={18} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={labels.next}
                className="flex size-12 items-center justify-center rounded-full bg-ink text-paper transition-colors hover:bg-earth"
              >
                <Icon name="chevronEnd" size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </LazyMotion>
  )
}
