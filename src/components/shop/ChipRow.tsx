'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

/**
 * A sideways-scrolling row of chips that brings the current one (aria-current="page") fully
 * into view when the page loads or the choice changes: instantly, no animation. Works the same
 * in Arabic (the delta is measured on screen, so the direction of scrollLeft doesn't matter).
 * Without JavaScript it is a plain scrollable row.
 */
export function ChipRow({
  label,
  activeKey,
  className,
  style,
  children,
}: {
  label: string
  /** Changes when another chip becomes current, so the row re-aligns. */
  activeKey: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const row = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = row.current
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!el || !active) return
    const box = el.getBoundingClientRect()
    const chip = active.getBoundingClientRect()
    const gutter = 24
    const delta =
      chip.left < box.left + gutter
        ? chip.left - box.left - gutter
        : chip.right > box.right - gutter
          ? chip.right - box.right + gutter
          : 0
    if (delta) el.scrollBy({ left: delta, behavior: 'instant' })
  }, [activeKey])

  return (
    <nav ref={row} aria-label={label} className={className} style={style}>
      {children}
    </nav>
  )
}
