import { Icon } from '@/components/ui/Icon'
import { Ltr } from '@/components/ui/Ltr'
import { Picture } from '@/components/ui/Picture'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { ProductCard } from '@/lib/cms/home'
import { externalLinkProps, orderHref } from '@/lib/links'

import { ProductCarousel } from './ProductCarousel'
import { container, Emphasis, EmptyNote, SectionHeading } from './shared'

/**
 * Up to eight real products (featured first, then the newest) in a looping carousel.
 * The cards are rendered here on the server; the carousel only places and moves them.
 * Ordering goes to WhatsApp until the shop exists (phase 5).
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
  const slides = products.map((product) => {
    const href = orderHref({ locale, whatsappNumber, productName: product.name })
    return (
      <article
        key={product.id}
        className="flex h-full flex-col gap-2 rounded-card bg-paper-bright p-2.5 shadow-soft"
      >
        <Picture
          photo={product.photo}
          hint={t.photoHints.product}
          soon={t.photoSoon}
          sizes="(min-width: 1024px) 16rem, 220px"
          className="aspect-[200/240] w-full rounded-t-[6.25rem] rounded-b-[0.625rem]"
        />
        <h3 className="display m-0 px-1.5 text-xl font-normal">{product.name}</h3>
        {product.category && (
          <p className="m-0 -mt-1 px-1.5 text-xs text-ink-soft">{product.category}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 ps-1.5">
          <span className="text-sm tabular-nums text-ink-soft">
            {product.inStock ? <Ltr>{product.price}</Ltr> : t.outOfStock}
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
      </article>
    )
  })

  return (
    <section aria-labelledby="shop-title" id="shop" className="grain overflow-x-clip bg-paper">
      <div className={`${container} flex items-end justify-between gap-4 pt-16 lg:pt-21`}>
        <SectionHeading id="shop-title">
          <Emphasis text={heading} />
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
        <div className="pt-8 pb-16 lg:pb-21">
          <ProductCarousel
            slides={slides}
            rtl={locale === 'ar'}
            labels={{
              region: heading.replace(/\*/g, ''),
              previous: t.previousProduct,
              next: t.nextProduct,
              slideOf: t.productOf,
            }}
          />
        </div>
      ) : (
        <div className={`${container} pt-5 pb-16 lg:pb-21`}>
          <EmptyNote className="text-ink-soft">{t.shopSoon}</EmptyNote>
        </div>
      )}
    </section>
  )
}
