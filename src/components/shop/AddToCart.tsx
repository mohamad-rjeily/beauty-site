'use client'

import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { MAX_QUANTITY } from '@/lib/shop'

type Labels = {
  quantity: string
  fewer: string
  more: string
  addToCart: string
  outOfStock: string
}

const stepButton =
  'flex size-12 items-center justify-center rounded-full text-ink transition-colors hover:bg-sand disabled:opacity-35 disabled:hover:bg-transparent'

/**
 * Quantity stepper (1 to what is in stock) and the Add to cart pill. The cart itself arrives
 * in checkpoint 3; until then the button only shows its place and states.
 */
export function AddToCart({ stock, labels }: { stock: number; labels: Labels }) {
  const max = Math.min(stock, MAX_QUANTITY)
  const [quantity, setQuantity] = useState(1)

  if (max < 1) {
    return (
      <p className="m-0 inline-flex min-h-[3.25rem] items-center rounded-full border border-line px-6 text-[0.9375rem] font-semibold text-ink-soft">
        {labels.outOfStock}
      </p>
    )
  }

  return (
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
        <output aria-live="polite" className="w-7 text-center text-[0.9375rem] font-semibold tabular-nums">
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
        className="inline-flex min-h-[3.25rem] grow items-center justify-center gap-2.5 rounded-full bg-clay px-6 text-[0.9375rem] font-semibold text-paper [transition:background-color_200ms_ease,scale_220ms_cubic-bezier(0.23,1,0.32,1)] hover:bg-clay-deep active:scale-[0.97] sm:grow-0"
      >
        <Icon name="bag" size={18} />
        {labels.addToCart}
      </button>
    </div>
  )
}
