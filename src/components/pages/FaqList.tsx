'use client'

import { animate } from 'motion'
import { useRef, type MouseEvent } from 'react'

import { prefersReducedMotion } from '@/components/motion/scroll'
import { Icon } from '@/components/ui/Icon'
import type { FaqItem } from '@/lib/cms/pages'

const EASE = [0.25, 1, 0.5, 1] as const

/**
 * FAQ as native disclosures (`<details name="faq">`): one answer open at a time, and it all
 * works without JavaScript. With JavaScript the change is animated with transform and opacity
 * only, never a height tween:
 * - the answer fades in and rises 8px (fades out before it closes);
 * - rows below glide from their old place to their new one (FLIP: measure, change, invert);
 * - the plus turns 45° into a cross (CSS).
 * Reduced motion: the answer just fades; rows move instantly.
 */
export function FaqList({ items }: { items: FaqItem[] }) {
  const listRef = useRef<HTMLDivElement>(null)

  const glide = (rows: HTMLElement[], before: number[]) => {
    if (prefersReducedMotion()) return
    rows.forEach((row, i) => {
      const dy = before[i] - row.getBoundingClientRect().top
      if (Math.abs(dy) > 0.5)
        animate(
          row,
          { transform: [`translateY(${dy}px)`, 'translateY(0px)'] },
          {
            duration: 0.35,
            ease: EASE,
          },
        )
    })
  }

  const onToggle = (event: MouseEvent<HTMLElement>) => {
    const list = listRef.current
    const target = event.currentTarget.parentElement as HTMLDetailsElement | null
    if (!list || !target) return
    event.preventDefault()
    const rows = [...list.querySelectorAll<HTMLDetailsElement>('details')]
    const tops = () => rows.map((row) => row.getBoundingClientRect().top)
    const answer = (row: HTMLDetailsElement) => row.querySelector<HTMLElement>('[data-answer]')
    const reduced = prefersReducedMotion()

    if (target.open) {
      // Closing: the answer fades out first, then the rows below close the gap.
      const el = answer(target)
      const done = el ? animate(el, { opacity: 0 }, { duration: 0.15 }) : Promise.resolve()
      void Promise.resolve(done).then(() => {
        const before = tops()
        target.open = false
        el?.style.removeProperty('opacity')
        glide(rows, before)
      })
      return
    }

    const before = tops()
    for (const row of rows) row.open = row === target
    glide(rows, before)
    const el = answer(target)
    if (el)
      animate(
        el,
        reduced
          ? { opacity: [0, 1] }
          : { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0px)'] },
        { duration: 0.3, ease: EASE },
      )
  }

  return (
    <div ref={listRef} className="flex flex-col border-t border-line">
      {items.map((item, i) => (
        <details key={item.id} name="faq" open={i === 0} className="group border-b border-line">
          <summary
            onClick={onToggle}
            className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-ink [&::-webkit-details-marker]:hidden"
          >
            <span className="font-display text-[1.1875rem] leading-[1.25] lg:text-[1.375rem]">
              {item.question}
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stone transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-open:rotate-45 motion-reduce:transition-none">
              <Icon name="plus" size={16} />
            </span>
          </summary>
          <p
            data-answer
            className="m-0 max-w-[60ch] pe-13 pb-5 text-[0.9375rem] leading-[1.65] whitespace-pre-line text-ink-soft"
          >
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  )
}
