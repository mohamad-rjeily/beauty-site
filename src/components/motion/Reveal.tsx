'use client'

import { animate, inView, type DOMKeyframesDefinition } from 'motion'
import { useEffect, useRef, type ReactNode } from 'react'

export type RevealVariant = 'rise' | 'riseFar' | 'fromStart' | 'fromEnd' | 'wipe' | 'uncover'

const EASE = [0.16, 1, 0.3, 1] as const

type Frames = {
  from: Record<string, string>
  to: DOMKeyframesDefinition
  duration: number
  ease?: readonly [number, number, number, number]
}

/**
 * Keyframes per variant. `rtl` mirrors the horizontal ones so "from the start side" means
 * the right in Arabic. With reduced motion every variant becomes a short plain fade.
 */
const frames = (variant: RevealVariant, rtl: boolean, reduced: boolean): Frames => {
  if (reduced) {
    return variant === 'uncover'
      ? { from: { opacity: '1' }, to: { opacity: 0 }, duration: 0.3 }
      : { from: { opacity: '0' }, to: { opacity: 1 }, duration: 0.3 }
  }
  const side = (sign: 1 | -1) => `${(rtl ? -sign : sign) * 32}px`
  switch (variant) {
    case 'rise':
      return {
        from: { opacity: '0', transform: 'translateY(24px)' },
        to: { opacity: 1, transform: 'translateY(0px)' },
        duration: 0.8,
      }
    case 'riseFar':
      return {
        from: { opacity: '0', transform: 'translateY(40px)' },
        to: { opacity: 1, transform: 'translateY(0px)' },
        duration: 0.8,
      }
    case 'fromStart':
      return {
        from: { opacity: '0', transform: `translateX(${side(-1)})` },
        to: { opacity: 1, transform: 'translateX(0px)' },
        duration: 0.8,
      }
    case 'fromEnd':
      return {
        from: { opacity: '0', transform: `translateX(${side(1)})` },
        to: { opacity: 1, transform: 'translateX(0px)' },
        duration: 0.8,
      }
    case 'wipe': {
      // A pen moving in the reading direction: left-to-right in English, right-to-left in Arabic.
      // The insets bleed past the box (-25% / -10%) so rotated script flourishes and
      // descenders are never clipped, during or after the reveal. Near-constant speed,
      // like writing, rather than a fast-then-crawl ease.
      const hidden = rtl ? 'inset(-25% -10% -25% 100%)' : 'inset(-25% 100% -25% -10%)'
      return {
        from: { clipPath: hidden },
        to: { clipPath: 'inset(-25% -10% -25% -10%)' },
        duration: 1.8,
        ease: [0.65, 0, 0.35, 1],
      }
    }
    case 'uncover':
      // A layer that starts covering its section and fades away (opacity only, compositor).
      // It is invisible by default (opacity-0 in markup), so without JS nothing is covered.
      return { from: { opacity: '1' }, to: { opacity: 0 }, duration: 0.4 }
  }
}

/**
 * Scroll reveal that never hides content by default: the server renders everything visible.
 * After hydration, only elements still below the fold are set to their start state, then
 * animated once when they enter the viewport. Anything already on screen is left alone.
 */
export function Reveal({
  children,
  variant = 'rise',
  delay = 0,
  className,
  as: Tag = 'div',
  id,
}: {
  children: ReactNode
  variant?: RevealVariant
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'p' | 'span'
  id?: string
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rtl = document.documentElement.dir === 'rtl'
    const { from, to, duration, ease = EASE } = frames(variant, rtl, reduced)
    Object.assign(el.style, from)

    const stop = inView(
      el,
      () => {
        animate(el, to, { duration, delay: reduced ? 0 : delay, ease })
      },
      { amount: variant === 'uncover' ? 0.15 : 0.25 },
    )
    return () => {
      stop()
      for (const key of Object.keys(from))
        el.style.removeProperty(key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`))
    }
  }, [variant, delay])

  return (
    // @ts-expect-error: polymorphic tag with a shared HTMLElement ref
    <Tag ref={ref} className={className} id={id}>
      {children}
    </Tag>
  )
}
