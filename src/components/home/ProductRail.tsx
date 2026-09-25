import { Icon } from '@/components/ui/Icon'
import { Picture } from '@/components/ui/Picture'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { ProductCard } from '@/lib/cms/home'
import { externalLinkProps, orderHref } from '@/lib/links'

import { container, EmphasizeLast, EmptyNote, SectionHeading } from './shared'

/**
 * Sideways rail of real products with native scroll-snap (no JavaScript). Cards alternate
 * their vertical offset for rhythm. Ordering goes to WhatsApp until the shop exists (phase 5).
 */
export function ProductRail({
  heading,
  products,
  whatsappNumber,
  locale,
  t,
}: {
  heading: string
  products: ProductCard[]
  whatsappNumber?: string | null
  locale: Locale
  t: Dictionary
}) {
  return (
    <section aria-labelledby="shop-title" id="shop" className="grain bg-paper">
      <div className={`${container} flex items-end justify-between gap-4 pt-16 lg:pt-28`}>
        <SectionHeading id="shop-title">
          <EmphasizeLast text={heading} />
        </SectionHeading>
        {products.length > 1 && (
          <span
            aria-hidden="true"
            className="flex items-center gap-1.5 pb-2 text-[0.8125rem] text-ink-soft lg:hidden"
          >
            {t.swipe} <Icon name="arrow" size={18} />
          </span>
        )}
      </div>

      {products.length > 0 ? (
        <ul
          className="no-scrollbar m-0 flex list-none snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-ps-6 px-6 pt-6 pb-16 lg:mx-auto lg:max-w-[75rem] lg:scroll-ps-10 lg:px-10 lg:pb-28"
          aria-label={heading}
        >
          {products.map((product, i) => {
            const href = orderHref({ locale, whatsappNumber, productName: product.name })
            return (
              <li
                key={product.id}
                className={`flex w-[13.75rem] shrink-0 snap-start flex-col gap-2 rounded-card bg-paper-bright p-2.5 shadow-soft lg:w-[16.5rem] ${i % 2 ? 'mt-7' : ''}`}
              >
                <Picture
                  photo={product.photo}
                  hint={t.photoHints.product}
                  soon={t.photoSoon}
                  sizes="(min-width: 1024px) 16rem, 220px"
                  className="aspect-[200/240] w-full rounded-t-[6.25rem] rounded-b-[0.625rem]"
                />
                {product.category && (
                  <span className="px-1.5 pt-1 text-[0.6875rem] font-semibold tracking-[0.14em] text-clay uppercase rtl:tracking-normal rtl:text-xs">
                    {product.category}
                  </span>
                )}
                <h3 className="display m-0 px-1.5 text-xl font-normal">{product.name}</h3>
                <div className="mt-auto flex items-center justify-between gap-2 ps-1.5">
                  <span className="text-sm tabular-nums text-ink-soft">
                    {product.inStock ? product.price : t.outOfStock}
                  </span>
                  {href && product.inStock && (
                    <a
                      href={href}
                      {...externalLinkProps}
                      aria-label={`${t.orderOnWhatsApp}: ${product.name}`}
                      className="flex size-11 items-center justify-center rounded-full bg-ink text-paper transition-colors hover:bg-earth"
                    >
                      <Icon name="bag" size={18} />
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className={`${container} pt-5 pb-16 lg:pb-28`}>
          <EmptyNote className="text-ink-soft">{t.shopSoon}</EmptyNote>
        </div>
      )}
    </section>
  )
}
