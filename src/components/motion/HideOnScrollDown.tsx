'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Slides its content out of view on a fast scroll down and back on any scroll up.
 * One passive listener, throttled to animation frames; only a class changes, and the
 * transition itself is CSS (transform), so the main thread does almost nothing.
 */
export function HideOnScrollDown({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let lastY = window.scrollY
    let lastTime = performance.now()
    let frame = 0

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const now = performance.now()
        const y = window.scrollY
        const speed = (y - lastY) / Math.max(now - lastTime, 1) // px per ms
        const el = ref.current
        if (el) {
          if (speed > 0.9 && y > 400) el.dataset.hidden = 'true'
          else if (y < lastY || y < 200) delete el.dataset.hidden
        }
        lastY = y
        lastTime = now
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[hidden=true]:translate-y-[calc(100%+1rem)] motion-reduce:transition-none ${className}`}
    >
      {children}
    </div>
  )
}
