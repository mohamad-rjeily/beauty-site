'use client'

import { usePathname } from 'next/navigation'

import { Icon } from '@/components/ui/Icon'
import { PillLink } from '@/components/ui/Pill'
import { cartCount } from '@/lib/cart'
import { useCart } from '@/lib/cartStore'

import { isShopPath } from './RouteSwitch'

/**
 * The main pill of the phone's bottom bar. In the shop (list and product pages), once the
 * cart has something in it, it becomes "View cart (n)"; everywhere else, and with an empty
 * cart, it is Book. The server renders Book; the switch happens once the cart is read.
 */
export function BarMainAction({
  bookHref,
  bookLabel,
  cartHref,
  viewCartLabel,
}: {
  bookHref: string
  bookLabel: string
  cartHref: string
  /** "View cart ({n})" */
  viewCartLabel: string
}) {
  const count = cartCount(useCart())
  if (isShopPath(usePathname()) && count > 0) {
    return (
      <PillLink href={cartHref} className="flex-1">
        <Icon name="bag" size={18} /> {viewCartLabel.replace('{n}', String(count))}
      </PillLink>
    )
  }
  return (
    <PillLink href={bookHref} className="flex-1">
      {bookLabel} <Icon name="arrow" size={18} />
    </PillLink>
  )
}
