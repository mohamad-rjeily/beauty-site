'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { cart } from '@/lib/cartStore'
import { MAX_QUANTITY } from '@/lib/shop'

/**
 * The round "+" on a home rail card: adds one to the cart. It turns into a check mark, and a
 * short line with "View cart" appears under the price (announced to screen readers). It sits
 * above the card's stretched link, so tapping it never opens the product page.
 */
export function QuickAdd({
  productId,
  name,
  stock,
  priceCents,
  cartHref,
  labels,
}: {
  productId: number
  name: string
  stock: number
  priceCents: number
  cartHref: string
  labels: { add: string; added: string; view: string; allInCart: string }
}) {
  const limit = Math.min(stock, MAX_QUANTITY)
  const [result, setResult] = useState<'added' | 'full' | null>(null)

  // The check mark turns back into "+" after a moment; the line stays until the next tap.
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    if (!checked) return
    const timer = window.setTimeout(() => setChecked(false), 1600)
    return () => window.clearTimeout(timer)
  }, [checked])

  const add = () => {
    const added = cart.add(productId, 1, limit, { priceCents, name })
    setResult(added > 0 ? 'added' : 'full')
    setChecked(added > 0)
  }

  return (
    <>
      <button
        type="button"
        onClick={add}
        aria-label={labels.add}
        className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper [transition:background-color_200ms_ease,scale_220ms_cubic-bezier(0.23,1,0.32,1)] hover:bg-earth active:scale-[0.94]"
      >
        <span key={checked ? 'check' : 'plus'} className="motion-fade flex">
          <Icon name={checked ? 'check' : 'plus'} size={18} />
        </span>
      </button>
      {/* The card is narrow: the message and its link stack rather than wrap mid-line. */}
      <p aria-live="polite" className="relative z-10 m-0 basis-full text-[0.8125rem]">
        {result && (
          <span className="motion-fade flex flex-col items-start">
            <span className={result === 'added' ? 'font-semibold text-ink' : 'text-ink-soft'}>
              {result === 'added' ? labels.added : labels.allInCart.replace('{n}', String(limit))}
            </span>
            <Link
              href={cartHref}
              className="-mt-1.5 inline-flex min-h-11 items-center font-semibold text-clay underline decoration-1 underline-offset-4"
            >
              {labels.view}
            </Link>
          </span>
        )}
      </p>
    </>
  )
}
