'use client'

import { useEffect, useRef } from 'react'

import { hasPlaceholder, splitEmphasis } from '@/lib/emphasis'

import { at, linkToScroll, prefersReducedMotion } from './scroll'

/**
 * A section heading that reveals word by word, linked to the scroll: each word fades and rises
 * a little as the heading enters, a beat after the one before it, and goes back when the
 * visitor scrolls up. Word order is the DOM order, so Arabic reveals right to left.
 *
 * Server-rendered fully visible; the effect is bound after hydration. Starred parts of the
 * text are set in italics (see Emphasis). Reduced motion: opacity only.
 */
export function ScrollWords({
  text,
  as: Tag = 'h2',
  id,
  className = '',
}: {
  text: string
  as?: 'h2' | 'h3' | 'p'
  id?: string
  className?: string
}) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const words = [...el.querySelectorAll<HTMLElement>('[data-word]')]
    const reduced = prefersReducedMotion()
    // The whole heading is revealed over ~40% of the viewport, whatever its word count.
    const step = Math.min(0.06, 0.2 / Math.max(1, words.length - 1))
    const stops = words.map((word, i) =>
      linkToScroll(
        word,
        reduced
          ? { opacity: [0, 1] }
          : { opacity: [0, 1], transform: ['translateY(0.45em)', 'translateY(0em)'] },
        el,
        [at('start', 0.98 - i * step), at('start', 0.78 - i * step)],
      ),
    )
    return () => stops.forEach((stop) => stop())
  }, [text])

  return (
    <Tag ref={ref} id={id} className={className}>
      {splitEmphasis(text).map((part, p) => {
        const words = part.text.split(/(\s+)/).map((word, w) =>
          /^\s+$/.test(word) || !word ? (
            word
          ) : (
            <span key={w} data-word className="inline-block">
              {hasPlaceholder(word) ? <bdi>{word}</bdi> : word}
            </span>
          ),
        )
        return part.em ? (
          <em key={p} className="italic">
            {words}
          </em>
        ) : (
          <span key={p}>{words}</span>
        )
      })}
    </Tag>
  )
}
