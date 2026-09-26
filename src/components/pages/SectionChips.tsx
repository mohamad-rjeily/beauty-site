'use client'

import { useEffect, useState } from 'react'

type Chip = { id: string; label: string; count: number }

/**
 * Links to the page's sections as pill chips. The ink fill follows the section in view
 * (250ms colour change), and a tap glides there (smooth scroll is set on <html>). Plain
 * anchor links, so they work without JavaScript.
 */
export function SectionChips({ chips, label }: { chips: Chip[]; label: string }) {
  const [active, setActive] = useState(chips[0]?.id)

  useEffect(() => {
    const sections = chips
      .map((chip) => document.getElementById(chip.id))
      .filter((section): section is HTMLElement => section !== null)
    // Active = the last section whose top has passed 40% down the screen (the first one
    // until then). Recomputed only when a section crosses that line, not on every scroll.
    const update = () => {
      const line = window.innerHeight * 0.4
      const passed = sections.filter((s) => s.getBoundingClientRect().top <= line)
      setActive((passed.at(-1) ?? sections[0])?.id)
    }
    const observer = new IntersectionObserver(update, { rootMargin: '-40% 0px -60% 0px' })
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [chips])

  return (
    <nav
      aria-label={label}
      className="motion-rise flex flex-wrap gap-2"
      style={{ ['--i' as string]: 3 }}
    >
      {chips.map((chip) => (
        <a
          key={chip.id}
          href={`#${chip.id}`}
          aria-current={chip.id === active ? 'true' : undefined}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone px-[1.125rem] text-[0.8125rem] font-semibold text-ink no-underline transition-colors duration-[250ms] ease-[cubic-bezier(0.25,1,0.5,1)] hover:border-ink aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-paper"
        >
          {chip.label}
          <span className="tabular-nums opacity-70">{chip.count}</span>
        </a>
      ))}
    </nav>
  )
}
