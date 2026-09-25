'use client'

import { animate, scroll } from 'motion'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Moves its content down by `distance` px while its section scrolls out, so the photo drifts
 * at roughly 0.85× the page speed. Motion drives this with the browser's ScrollTimeline where
 * available (compositor only, no scroll handler). Off with reduced motion.
 */
export function Parallax({
  children,
  distance = 90,
  className,
}: {
  children: ReactNode
  distance?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const target = el.closest('section') ?? el
    return scroll(
      animate(
        el,
        { transform: ['translateY(0px)', `translateY(${distance}px)`] },
        { ease: 'linear' },
      ),
      {
        target,
        offset: ['start start', 'end start'],
      },
    )
  }, [distance])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
