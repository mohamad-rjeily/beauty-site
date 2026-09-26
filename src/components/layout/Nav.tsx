'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { Icon } from '@/components/ui/Icon'
import type { Locale } from '@/i18n/config'
import { pageHref, type PageKey } from '@/lib/links'

import type { NavLabels } from './navLabels'

const MENU: PageKey[] = ['services', 'gallery', 'about', 'contact', 'shop']

type Tone = 'light' | 'dark'

/** Hover wash per tone: paper over photos, sand on paper and limestone. */
const hover: Record<Tone, string> = {
  light: 'text-paper hover:bg-paper/10',
  dark: 'text-ink hover:bg-sand',
}

/** The same page in the other language: /en/gallery <-> /ar/gallery. */
export function LanguageSwitch({
  locale,
  t,
  tone = 'dark',
}: {
  locale: Locale
  t: NavLabels
  tone?: Tone
}) {
  const pathname = usePathname()
  const other = locale === 'en' ? 'ar' : 'en'
  const href = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${other}`) || `/${other}`
  return (
    <Link
      href={href}
      hrefLang={other}
      lang={other}
      aria-label={t.switchLanguageLabel}
      className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold no-underline ${hover[tone]}`}
    >
      {t.switchLanguage}
    </Link>
  )
}

/**
 * The site menu: a native disclosure (works without JavaScript, keyboard and screen-reader
 * friendly) opening a paper card. It closes itself after a choice, since the header stays
 * mounted across page changes. The current page is marked with aria-current.
 */
export function SiteMenu({
  locale,
  t,
  tone = 'dark',
}: {
  locale: Locale
  t: NavLabels
  tone?: Tone
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (ref.current) ref.current.open = false
  }, [pathname])

  return (
    <details ref={ref} className="relative">
      <summary
        aria-label={t.menu}
        className={`flex size-11 cursor-pointer list-none items-center justify-center rounded-full [&::-webkit-details-marker]:hidden ${hover[tone]}`}
      >
        <Icon name="menu" size={22} />
      </summary>
      <nav aria-label={t.mainNav}>
        <ul className="absolute end-0 top-full z-30 m-0 mt-2 flex min-w-48 list-none flex-col rounded-card bg-paper p-2 text-ink shadow-lift">
          {MENU.map((key) => {
            const href = pageHref(locale, key)
            const current = pathname === href
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  onClick={() => ref.current && (ref.current.open = false)}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-[0.9375rem] font-semibold text-ink no-underline hover:bg-sand aria-[current=page]:text-clay"
                >
                  {t.nav[key]}
                  {current && <span aria-hidden="true" className="size-1.5 rounded-full bg-clay" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </details>
  )
}
