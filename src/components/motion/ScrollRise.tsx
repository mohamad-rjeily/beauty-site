'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import { at, fadeInOnce, linkToScroll, prefersReducedMotion } from './scroll'

/**
 * Rises `distance` px and fades in as it enters the viewport, linked to the scroll (reverses on
 * the way back up). `order` delays it by a fraction of the viewport, which staggers siblings
 * in the same row: pass the column index and the start column (right in Arabic) goes first.
 * `from="start"` / `"end"` slides in from that side instead (mirrored in Arabic).
 * Visible without JavaScript; reduced motion: a one-time fade instead.
 *
 * Positions are measured when the effect is bound: pass `rebind` a value that changes when
 * the element moves in the layout (e.g. a filter), so it measures its new place.
 */
export function ScrollRise({
  children,
  order = 0,
  distance = 32,
  from = 'below',
  rebind,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  order?: number
  distance?: number
  from?: 'below' | 'start' | 'end'
  rebind?: string | number
  className?: string
  as?: 'div' | 'li' | 'p' | 'figure' | 'article' | 'section'
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) return fadeInOnce(el)
    const lag = order * 0.06
    // Start side is the left in English and the right in Arabic.
    const rtl = document.documentElement.dir === 'rtl'
    const side = (from === 'start' ? -1 : 1) * (rtl ? -1 : 1)
    const shift =
      from === 'below'
        ? [`translateY(${distance}px)`, 'translateY(0px)']
        : [`translateX(${side * distance}px)`, 'translateX(0px)']
    return linkToScroll(el, { opacity: [0, 1], transform: shift }, el, [
      at('start', 1 - lag),
      at('start', 0.72 - lag),
    ])
  }, [order, distance, from, rebind])

  return (
    // @ts-expect-error: polymorphic tag with a shared HTMLElement ref
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}

/**
 * Moves at a slightly different speed than the page (gentle parallax): from +distance/2 px
 * when it enters to -distance/2 px when it leaves. Off with reduced motion.
 */
export function Drift({
  children,
  distance = 48,
  className,
}: {
  children: ReactNode
  distance?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    return linkToScroll(
      el,
      { transform: [`translateY(${distance / 2}px)`, `translateY(${-distance / 2}px)`] },
      el,
      ['start end', 'end start'],
      'linear',
    )
  }, [distance])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

/**
 * A short rule that draws itself in the reading direction (left to right in English, right to
 * left in Arabic) as it scrolls into view, and undraws on the way back. Reduced motion: static.
 */
export function DrawRule({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    return linkToScroll(el, { transform: ['scaleX(0)', 'scaleX(1)'] }, el, [
      at('start', 0.95),
      at('start', 0.7),
    ])
  }, [])

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`block ltr:origin-left rtl:origin-right ${className}`}
    />
  )
}
