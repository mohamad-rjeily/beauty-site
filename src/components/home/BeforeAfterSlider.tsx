'use client'

import {
  animate,
  domAnimation,
  LazyMotion,
  m,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'

import { Picture } from '@/components/ui/Picture'
import type { ResultPair } from '@/lib/cms/home'

type Labels = { before: string; after: string; compare: string; soon: string; hint: string }

/**
 * The page's signature interaction: an arch-framed before/after comparison.
 * - drag or tap anywhere on the image (vertical scrolling still works: touch-action pan-y);
 * - arrow keys through a real, visually hidden range input (screen readers get a slider);
 * - on first view it sweeps once (50 → 70 → 50%) to invite a drag, unless reduced motion;
 * - in Arabic it mirrors: "before" sits on the right and dragging follows the finger.
 */
export function BeforeAfterSlider({
  pairs,
  labels,
  rtl,
}: {
  pairs: ResultPair[]
  labels: Labels
  rtl: boolean
}) {
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState(50)
  const frameRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const touched = useRef(false)
  const reduced = useReducedMotion()
  const inView = useInView(frameRef, { once: true, amount: 0.5 })

  const target = useMotionValue(50)
  const position = useSpring(target, { stiffness: 380, damping: 38, mass: 0.6 })
  const clip = useTransform(position, (p) =>
    rtl ? `inset(0 0 0 ${100 - p}%)` : `inset(0 ${100 - p}% 0 0)`,
  )
  // The handle layer spans the frame, so a translateX percentage equals the handle's position:
  // compositor-only, no layout per frame. Mirrored in RTL.
  const handleShift = useTransform(position, (p) => `translateX(${rtl ? -p : p}%)`)
  const sweep = useRef<ReturnType<typeof animate> | null>(null)

  /** Any real input takes over from the one-time invitation sweep. */
  const takeOver = () => {
    touched.current = true
    sweep.current?.stop()
    sweep.current = null
  }

  const setTo = (next: number) => {
    const clamped = Math.min(100, Math.max(0, next))
    target.set(clamped)
    setValue(Math.round(clamped))
  }

  useEffect(() => {
    if (!inView || reduced || touched.current) return
    sweep.current = animate(target, [50, 70, 50], {
      duration: 1.6,
      ease: [0.45, 0, 0.2, 1],
      delay: 0.2,
    })
    return () => sweep.current?.stop()
  }, [inView, reduced, target])

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const fraction = rtl
      ? (rect.right - event.clientX) / rect.width
      : (event.clientX - rect.left) / rect.width
    setTo(fraction * 100)
  }

  const pair = pairs[index]

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex flex-col gap-4">
        <div
          ref={frameRef}
          className="relative aspect-[342/420] w-full touch-pan-y overflow-hidden rounded-t-full rounded-b-[0.875rem] bg-sand shadow-lift select-none lg:aspect-[4/5]"
          onPointerDown={(event) => {
            takeOver()
            dragging.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
            fromPointer(event)
          }}
          onPointerMove={(event) => dragging.current && fromPointer(event)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          {/* Keyed by pair: switching pairs cross-fades in the new photos (CSS, 250 ms). */}
          <div key={pair.id} className="motion-fade absolute inset-0">
            <Picture
              photo={pair.after}
              hint={labels.hint}
              soon={labels.soon}
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="absolute inset-0"
            />
            <m.div className="absolute inset-0" style={{ clipPath: clip }}>
              <Picture
                photo={pair.before}
                hint={labels.hint}
                soon={labels.soon}
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="absolute inset-0"
                tone="dark"
              />
            </m.div>
          </div>

          <span className="absolute start-4 bottom-4 rounded-full bg-ink/80 px-3 py-1.5 text-[0.6875rem] font-semibold tracking-[0.14em] text-paper uppercase rtl:tracking-normal rtl:text-xs">
            {labels.before}
          </span>
          <span className="absolute end-4 bottom-4 rounded-full bg-clay px-3 py-1.5 text-[0.6875rem] font-semibold tracking-[0.14em] text-paper uppercase rtl:tracking-normal rtl:text-xs">
            {labels.after}
          </span>

          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ transform: handleShift }}
          >
            <span className="absolute inset-y-0 start-0 w-0.5 -translate-x-1/2 bg-paper rtl:translate-x-1/2" />
            <span className="absolute top-[58%] start-0 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-paper text-ink shadow-lift rtl:translate-x-1/2">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
              </svg>
            </span>
          </m.div>

          <input
            type="range"
            min={0}
            max={100}
            value={value}
            aria-label={labels.compare}
            aria-valuetext={`${labels.before} ${value}% · ${labels.after} ${100 - value}%`}
            onChange={(event) => {
              takeOver()
              setTo(Number(event.target.value))
              // Keyboard steps land instantly: keys shouldn't animate.
              position.jump(Number(event.target.value))
            }}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] ring-clay ring-offset-2 peer-focus-visible:ring-2"
          />
        </div>

        {pairs.length > 1 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {pairs.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={i === index}
                onClick={() => {
                  takeOver()
                  setIndex(i)
                  setTo(50)
                }}
                className="min-h-11 shrink-0 rounded-full border border-stone px-4 text-[0.8125rem] font-semibold text-ink transition-colors aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
              >
                {p.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </LazyMotion>
  )
}
