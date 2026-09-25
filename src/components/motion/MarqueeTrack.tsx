'use client'

import { useRef, type ReactNode } from 'react'

/**
 * The CSS marquee loop (`.motion-marquee`), slowed to half speed while a finger or cursor
 * rests on it, through the Web Animations API (no re-render, no restart).
 */
export function MarqueeTrack({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const setRate = (rate: number) => {
    for (const animation of ref.current?.getAnimations() ?? []) animation.playbackRate = rate
  }

  return (
    <div
      ref={ref}
      className={className}
      onPointerEnter={() => setRate(0.5)}
      onPointerDown={() => setRate(0.5)}
      onPointerLeave={() => setRate(1)}
      onPointerUp={() => setRate(1)}
      onPointerCancel={() => setRate(1)}
    >
      {children}
    </div>
  )
}
