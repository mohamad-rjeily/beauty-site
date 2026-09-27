import Link from 'next/link'

import { Ltr } from '@/components/ui/Ltr'
import { Picture } from '@/components/ui/Picture'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { ProductCard as Card } from '@/lib/cms/home'
import { productHref } from '@/lib/links'

/**
 * A product on the shop shelf: the home rail's bright-paper arch card at grid scale. The
 * whole card is the link. Out-of-stock products stay visible (she may come back for them),
 * with a quieter photo and the words instead of a price.
 */
export function ProductCard({
  product,
  locale,
  t,
  priority,
}: {
  product: Card
  locale: Locale
  t: Dictionary
  priority?: boolean
}) {
  return (
    <Link
      href={productHref(locale, product.slug)}
      className="group flex h-full flex-col gap-2.5 rounded-card bg-paper-bright p-2 text-ink no-underline shadow-soft [transition:translate_300ms_cubic-bezier(0.16,1,0.3,1),box-shadow_300ms_ease] hover:-translate-y-1 hover:shadow-lift lg:p-2.5"
    >
      <Picture
        photo={product.photo}
        hint={t.photoHints.product}
        soon={t.photoSoon}
        sizes="(min-width: 1024px) 17rem, (min-width: 640px) 30vw, 46vw"
        priority={priority}
        className={`aspect-[200/250] w-full rounded-t-full rounded-b-[0.5rem] ${
          product.inStock ? '' : 'opacity-60 saturate-50'
        }`}
      />
      <div className="flex grow flex-col gap-1 px-1 pb-1">
        <h2 className="display m-0 text-[1.1875rem] leading-[1.1] font-normal text-balance lg:text-[1.375rem]">
          {product.name}
        </h2>
        {product.category && (
          <p className="m-0 text-xs text-ink-soft">{product.category}</p>
        )}
        <p className="m-0 mt-auto flex flex-wrap items-baseline gap-x-2 pt-1 text-sm font-semibold tabular-nums">
          <Ltr>{product.price}</Ltr>
          {!product.inStock && (
            <span className="text-xs font-normal text-ink-soft">{t.outOfStock}</span>
          )}
        </p>
      </div>
    </Link>
  )
}
