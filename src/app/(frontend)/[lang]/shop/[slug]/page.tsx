import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { container } from '@/components/home/shared'
import { PageHeader } from '@/components/layout/SiteChrome'
import { AddToCart } from '@/components/shop/AddToCart'
import { PhotoStrip } from '@/components/shop/PhotoStrip'
import { Icon } from '@/components/ui/Icon'
import { Ltr } from '@/components/ui/Ltr'
import { getDictionary, type Dictionary } from '@/i18n'
import { isLocale, type Locale } from '@/i18n/config'
import { getShopProduct, type ShopProduct } from '@/lib/cms/shop'
import { getSiteChrome } from '@/lib/cms/site'
import { productHref, shopHref } from '@/lib/links'
import { siteUrl } from '@/lib/metadata'

/** Re-read from Payload at most once a minute (the cart re-checks price and stock anyway). */
export const revalidate = 60

type Params = Promise<{ lang: string; slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params
  if (!isLocale(lang)) return {}
  const [product, { settings }] = await Promise.all([
    getShopProduct(lang, slug),
    getSiteChrome(lang),
  ])
  if (!product) return {}
  const title = `${product.name} · ${settings.brandName}`
  const description = product.description[0]?.slice(0, 160)
  const image = product.photos[0]
  return {
    title,
    description,
    alternates: {
      canonical: productHref(lang, product.slug),
      languages: { en: productHref('en', product.slug), ar: productHref('ar', product.slug) },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: lang === 'ar' ? 'ar_LB' : 'en_US',
      // Link previews need an absolute address: only once the site's own URL is configured.
      ...(image && siteUrl()
        ? { images: [{ url: image.url, width: image.width, height: image.height, alt: image.alt }] }
        : {}),
    },
  }
}

/** One label + text row of the details list. Multi-line text keeps the owner's line breaks. */
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-sand py-4 first:border-t-0 first:pt-0">
      <dt className="text-[0.8125rem] font-semibold text-ink-soft">{label}</dt>
      <dd className="m-0 text-[0.9375rem] leading-relaxed whitespace-pre-line">{children}</dd>
    </div>
  )
}

/**
 * What she needs to trust the product. Homemade masks read like a labelled jar: when it was
 * made and until when to use it, side by side, then what is inside, how to store and use it,
 * and the patch-test note set apart so it can't be missed. Brand products: brand, size, use.
 * Empty fields are left out.
 */
function Details({ product, t }: { product: ShopProduct; t: Dictionary }) {
  const s = t.shopPage
  const h = product.homemade
  const rows: { label: string; value: string | null }[] = h
    ? [
        { label: s.ingredients, value: h.ingredients },
        { label: s.storage, value: h.storage },
        { label: s.howToUse, value: h.usage },
      ]
    : [
        { label: s.brand, value: product.brand },
        { label: s.size, value: product.size },
        { label: s.howToUse, value: product.howToUse },
      ]
  const filled = rows.filter((r) => r.value)
  const dates = h && (h.madeOn || h.expiresOn)
  if (!filled.length && !dates && !h?.patchTest) return null

  return (
    <div className="flex flex-col gap-4 rounded-card bg-paper p-5 shadow-soft lg:p-7">
      {dates && (
        <dl className="m-0 grid grid-cols-2 gap-3">
          {[
            { label: s.madeOn, value: h.madeOn },
            { label: s.bestBefore, value: h.expiresOn },
          ].map(
            (d) =>
              d.value && (
                <div key={d.label} className="flex flex-col gap-1 rounded-2xl bg-paper-bright px-4 py-3">
                  <dt className="text-[0.8125rem] font-semibold text-ink-soft">{d.label}</dt>
                  <dd className="m-0 text-[0.9375rem] font-semibold tabular-nums">{d.value}</dd>
                </div>
              ),
          )}
        </dl>
      )}
      {filled.length > 0 && (
        <dl className="m-0 flex flex-col">
          {filled.map((row) => (
            <Detail key={row.label} label={row.label}>
              {row.value}
            </Detail>
          ))}
        </dl>
      )}
      {h?.patchTest && (
        <div className="flex flex-col gap-1 rounded-2xl bg-clay-mist px-4 py-3.5 text-clay-deep">
          <p className="m-0 text-[0.8125rem] font-semibold">{s.patchTest}</p>
          <p className="m-0 text-[0.9375rem] leading-relaxed whitespace-pre-line">{h.patchTest}</p>
        </div>
      )}
    </div>
  )
}

/**
 * A product page: its photos in an arch, name, price and Add to cart first (all above the
 * fold on a phone), then the description and the details list.
 */
export default async function ProductPage({ params }: { params: Params }) {
  const { lang, slug } = await params
  const locale = (isLocale(lang) ? lang : 'en') as Locale
  const t = getDictionary(locale)
  const [product, { settings }] = await Promise.all([
    getShopProduct(locale, slug),
    getSiteChrome(locale),
  ])
  if (!product) notFound()

  const s = t.shopPage
  const meta = [product.category, product.type === 'homemade' ? s.homemade : product.brand]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <PageHeader settings={settings} locale={locale} t={t} />
      <section className="grain bg-limestone">
        <div className={`${container} pt-2 pb-24 lg:pt-6 lg:pb-32`}>
          <Link
            href={shopHref(locale, product.categorySlug)}
            className="-ms-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-full ps-1 pe-3 text-sm font-semibold text-ink-soft no-underline hover:text-ink lg:mb-6"
          >
            <Icon name="chevronStart" size={18} />
            {product.category ?? s.allProducts}
          </Link>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="motion-rise lg:col-span-6 lg:self-start lg:sticky lg:top-24">
              <PhotoStrip
                photos={product.photos}
                name={product.name}
                labels={{
                  region: s.photos,
                  photoOf: s.photoOf,
                  hint: t.photoHints.product,
                  soon: t.photoSoon,
                }}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-6 lg:col-span-5 lg:col-start-8 lg:pt-6">
              <div className="flex flex-col gap-3">
                <h1 className="display m-0 text-[2.75rem] text-balance lg:text-[4rem]">
                  {product.name}
                </h1>
                {meta && <p className="m-0 text-sm text-ink-soft">{meta}</p>}
                {product.inStock && (
                  <p className="m-0 pt-1 text-[1.5rem] font-semibold tabular-nums">
                    <Ltr>{product.price}</Ltr>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <AddToCart
                  stock={product.stock}
                  labels={{
                    quantity: s.quantity,
                    fewer: s.fewer,
                    more: s.more,
                    addToCart: s.addToCart,
                    outOfStock: t.outOfStock,
                  }}
                />
                {product.inStock && (
                  <p className="m-0 text-[0.8125rem] text-ink-soft">{s.cashNote}</p>
                )}
              </div>

              {product.description.length > 0 && (
                <div className="flex flex-col gap-3">
                  {product.description.map((paragraph, i) => (
                    <p
                      key={i}
                      className="m-0 max-w-[40ch] font-display text-[1.1875rem] leading-[1.5] font-light lg:text-[1.3125rem]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              <Details product={product} t={t} />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
