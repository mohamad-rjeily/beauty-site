'use client'

import { useEffect } from 'react'

const EVENTS = ['scroll', 'pointerdown', 'keydown', 'touchstart'] as const

/**
 * Sets `data-idle` on <html> once the visitor has done nothing for `after` ms, so one-time
 * idle cues (the WhatsApp ring) play when she is reading, not mid-scroll. Fires once.
 */
export function IdleFlag({ after = 8000 }: { after?: number }) {
  useEffect(() => {
    let timer = window.setTimeout(fire, after)
    function fire() {
      document.documentElement.dataset.idle = 'true'
      stop()
    }
    function reset() {
      window.clearTimeout(timer)
      timer = window.setTimeout(fire, after)
    }
    function stop() {
      window.clearTimeout(timer)
      for (const type of EVENTS) window.removeEventListener(type, reset)
    }
    for (const type of EVENTS) window.addEventListener(type, reset, { passive: true })
    return stop
  }, [after])

  return null
}
