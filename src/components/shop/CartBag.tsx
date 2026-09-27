'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { plural, type PluralForms } from '@/i18n'
import type { Locale } from '@/i18n/config'
import { cartCount } from '@/lib/cart'
import { CART_ADDED_EVENT, useCart } from '@/lib/cartStore'

type Tone = 'light' | 'dark'

const toneClass: Record<Tone, string> = {
  light: 'text-paper hover:bg-paper/10',
  dark: 'text-ink hover:bg-sand',
}

/**
 * The bag in every header state: opens the cart, with the number of items on a small clay
 * badge. It bumps when something is added. Before the page is running it shows no number
 * (the cart lives in this browser, the server can't know it).
 */
export function CartBag({
  href,
  locale,
  labels,
  tone = 'dark',
}: {
  href: string
  locale: Locale
  labels: { open: string; openWithCount: string; items: PluralForms }
  tone?: Tone
}) {
  const count = cartCount(useCart())
  const [bump, setBump] = useState(0)

  useEffect(() => {
    const onAdded = () => setBump((n) => n + 1)
    window.addEventListener(CART_ADDED_EVENT, onAdded)
    return () => window.removeEventListener(CART_ADDED_EVENT, onAdded)
  }, [])

  return (
    <Link
      href={href}
      aria-label={
        count > 0
          ? labels.openWithCount.replace('{items}', plural(labels.items, count, locale))
          : labels.open
      }
      className={`relative flex size-11 items-center justify-center rounded-full ${toneClass[tone]}`}
    >
      <span key={bump} className={bump ? 'motion-bump flex' : 'flex'}>
        <Icon name="bag" size={22} />
      </span>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute end-0.5 top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-clay px-1 text-[0.6875rem] leading-none font-semibold text-paper tabular-nums"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
