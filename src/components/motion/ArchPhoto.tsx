'use client'

import { useEffect, useRef } from 'react'

import { Picture } from '@/components/ui/Picture'
import type { Photo } from '@/lib/cms/home'

import { linkToScroll, prefersReducedMotion } from './scroll'

/**
 * A photo in a frame (usually an arch) that lives with the scroll: while the frame crosses the
 * viewport the photo settles from 1.08 to 1 and drifts slightly against the frame (parallax).
 * Two nested layers, one per transform, so the two effects never fight over one property.
 * The photo layer is 10% taller than the frame, so the drift never shows an edge.
 *
 * `className` shapes the frame (size, aspect, radius, border, shadow). Reduced motion: still.
 */
export function ArchPhoto({
  photo,
  hint,
  soon,
  sizes,
  className = '',
  tone,
  priority,
  zoom = 1.08,
}: {
  photo: Photo | null
  hint: string
  soon: string
  sizes: string
  className?: string
  tone?: 'light' | 'dark'
  priority?: boolean
  zoom?: number
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const driftRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const frame = frameRef.current
    const drift = driftRef.current
    const scale = zoomRef.current
    if (!frame || !drift || !scale || prefersReducedMotion()) return
    const pass = ['start end', 'end start'] as const
    const stops = [
      linkToScroll(
        drift,
        { transform: ['translateY(-4%)', 'translateY(4%)'] },
        frame,
        [...pass],
        'linear',
      ),
      linkToScroll(scale, { transform: [`scale(${zoom})`, 'scale(1)'] }, frame, [
        'start end',
        'center center',
      ]),
    ]
    return () => stops.forEach((stop) => stop())
  }, [zoom])

  // The frame is relative unless the caller positions it.
  const position = /(^|\s)(absolute|fixed)(\s|$)/.test(className) ? '' : 'relative'

  return (
    <div ref={frameRef} className={`${position} isolate overflow-hidden ${className}`}>
      <div ref={driftRef} className="absolute inset-x-0 -inset-y-[5%]">
        <div ref={zoomRef} className="absolute inset-0">
          <Picture
            photo={photo}
            hint={hint}
            soon={soon}
            sizes={sizes}
            tone={tone}
            priority={priority}
            className="absolute inset-0"
          />
        </div>
      </div>
    </div>
  )
}
