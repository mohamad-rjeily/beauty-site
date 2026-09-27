'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { cart } from '@/lib/cartStore'
import { MAX_QUANTITY } from '@/lib/shop'

type Labels = {
  quantity: string
  fewer: string
  more: string
  addToCart: string
  outOfStock: string
  added: string
  view: string
  allInCart: string
}

const stepButton =
  'flex size-12 items-center justify-center rounded-full text-ink transition-colors hover:bg-sand disabled:opacity-35 disabled:hover:bg-transparent'

/**
 * Quantity stepper (1 to what is in stock) and the Add to cart pill. After adding, a short
 * confirmation with a "View cart" link appears right under the button (the header is often
 * scrolled away on a phone), and screen readers hear it. The cart never holds more than the
 * stock; the cart page checks again with the server.
 */
export function AddToCart({
  productId,
  stock,
  priceCents,
  cartHref,
  labels,
}: {
  productId: number
  stock: number
  priceCents: number
  cartHref: string
  labels: Labels
}) {
  const max = Math.min(stock, MAX_QUANTITY)
  const [quantity, setQuantity] = useState(1)
  const [result, setResult] = useState<{ kind: 'added' | 'full'; key: number } | null>(null)

  if (max < 1) {
    return (
      <p className="m-0 inline-flex min-h-[3.25rem] items-center self-start rounded-full border border-line px-6 text-[0.9375rem] font-semibold text-ink-soft">
        {labels.outOfStock}
      </p>
    )
  }

  const add = () => {
    const added = cart.add(productId, quantity, max, priceCents)
    setResult({ kind: added > 0 ? 'added' : 'full', key: Date.now() })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <div
          role="group"
          aria-label={labels.quantity}
          className="flex h-[3.25rem] shrink-0 items-center rounded-full border border-line bg-paper-bright px-0.5"
        >
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label={labels.fewer}
            className={stepButton}
          >
            <Icon name="minus" size={18} />
          </button>
          <output className="w-7 text-center text-[0.9375rem] font-semibold tabular-nums">
            {quantity}
          </output>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(max, q + 1))}
            disabled={quantity >= max}
            aria-label={labels.more}
            className={stepButton}
          >
            <Icon name="plus" size={18} />
          </button>
        </div>
        <button
          type="button"
          onClick={add}
          className="inline-flex min-h-[3.25rem] grow items-center justify-center gap-2.5 rounded-full bg-clay px-6 text-[0.9375rem] font-semibold text-paper [transition:background-color_200ms_ease,scale_220ms_cubic-bezier(0.23,1,0.32,1)] hover:bg-clay-deep active:scale-[0.97] sm:grow-0"
        >
          <Icon name="bag" size={18} />
          {labels.addToCart}
        </button>
      </div>

      {/* Always in the page, so screen readers announce what appears in it. */}
      <p aria-live="polite" className="m-0 min-h-6 text-[0.875rem]">
        {result && (
          <span key={result.key} className="motion-fade inline-flex flex-wrap items-center gap-x-2">
            {result.kind === 'added' ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                <Icon name="check" size={16} className="text-clay" />
                {labels.added}
              </span>
            ) : (
              <span className="text-ink-soft">{labels.allInCart.replace('{n}', String(max))}</span>
            )}
            <span aria-hidden="true" className="text-stone">
              ·
            </span>
            <Link
              href={cartHref}
              className="inline-flex min-h-11 items-center font-semibold text-clay underline decoration-1 underline-offset-4 hover:text-clay-deep"
            >
              {labels.view}
            </Link>
          </span>
        )}
      </p>
    </div>
  )
}
