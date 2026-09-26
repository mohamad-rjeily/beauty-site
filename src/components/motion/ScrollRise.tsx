'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import { at, linkToScroll, prefersReducedMotion } from './scroll'

/**
 * Rises `distance` px and fades in as it enters the viewport, linked to the scroll (reverses on
 * the way back up). `order` delays it by a fraction of the viewport, which staggers siblings
 * in the same row: pass the column index and the start column (right in Arabic) goes first.
 * Visible without JavaScript; reduced motion keeps only the fade.
 */
export function ScrollRise({
  children,
  order = 0,
  distance = 32,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  order?: number
  distance?: number
  className?: string
  as?: 'div' | 'li' | 'p' | 'figure' | 'article'
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = prefersReducedMotion()
    const lag = order * 0.06
    return linkToScroll(
      el,
      reduced
        ? { opacity: [0, 1] }
        : { opacity: [0, 1], transform: [`translateY(${distance}px)`, 'translateY(0px)'] },
      el,
      [at('start', 1 - lag), at('start', 0.72 - lag)],
    )
  }, [order, distance])

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
