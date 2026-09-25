'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Keeps its content out of view until the visitor has scrolled past the hero (the element
 * marked `data-hero`, or 480px when a page has none), then slides it in on scroll up and
 * away on scroll down. Same approach as HideOnScrollDown: one passive listener throttled to
 * animation frames, only a data attribute changes, and the transition is CSS (transform).
 * While hidden it is `inert`, so keyboard focus never lands on an invisible header.
 */
export function ShowOnScrollUp({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let threshold = 480
    const measure = () => {
      const hero = document.querySelector('[data-hero]')
      threshold = hero ? hero.getBoundingClientRect().bottom + window.scrollY : 480
    }
    measure()

    let lastY = window.scrollY
    let frame = 0
    const setShown = (shown: boolean) => {
      if ((el.dataset.shown === 'true') === shown) return
      if (shown) el.dataset.shown = 'true'
      else delete el.dataset.shown
      el.inert = !shown
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const y = window.scrollY
        // A few pixels of tolerance so a trembling finger doesn't flicker it.
        if (y < threshold) setShown(false)
        else if (y < lastY - 4) setShown(true)
        else if (y > lastY + 4) setShown(false)
        if (Math.abs(y - lastY) > 4) lastY = y
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={ref}
      inert
      className={`-translate-y-[calc(100%+2rem)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] data-[shown=true]:translate-y-0 motion-reduce:translate-y-0 motion-reduce:opacity-0 motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:data-[shown=true]:opacity-100 ${className}`}
    >
      {children}
    </div>
  )
}
