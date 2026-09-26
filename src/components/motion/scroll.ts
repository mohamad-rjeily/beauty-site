import { animate, scroll, type DOMKeyframesDefinition } from 'motion'

/** Motion's scroll offsets, e.g. ['start end', 'end start']. */
export type ScrollOffset = NonNullable<NonNullable<Parameters<typeof scroll>[1]>['offset']>

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Binds keyframes on `el` to the scroll position of `target` in the viewport: they play forward
 * while scrolling down and reverse while scrolling up. Motion hands this to the browser's
 * ScrollTimeline where supported (runs on the compositor, no scroll handler); elsewhere it
 * falls back to one shared, frame-synced scroll listener. Use transform, opacity and
 * clip-path only. Returns the cleanup, which removes the effect (the element goes back to
 * its server-rendered, visible state).
 */
export const linkToScroll = (
  el: Element,
  keyframes: DOMKeyframesDefinition,
  target: Element,
  offset: ScrollOffset,
  ease: 'linear' | 'easeOut' = 'easeOut',
): (() => void) => scroll(animate(el, keyframes, { ease }), { target, offset })

/** "start 0.8" style offset point with a rounded number (no 0.7000000001 in the string). */
export const at = <E extends 'start' | 'center' | 'end'>(edge: E, viewport: number) =>
  `${edge} ${Math.round(viewport * 1000) / 1000}` as `${E} ${number}`
