import type { Metadata } from 'next'

import { container, EmptyNote } from '@/components/home/shared'
import { PageHeader } from '@/components/layout/SiteChrome'
import { PageHead } from '@/components/pages/shared'
import { CategoryChips } from '@/components/shop/CategoryChips'
import { ProductCard } from '@/components/shop/ProductCard'
import { PillLink } from '@/components/ui/Pill'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/i18n/config'
import { getShopPage } from '@/lib/cms/shop'
import { getSiteChrome } from '@/lib/cms/site'
import { shopHref } from '@/lib/links'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const { settings } = await getSiteChrome(lang)
  return {
    title: `${getDictionary(lang).nav.shop} · ${settings.brandName}`,
    alternates: { languages: { en: '/en/shop', ar: '/ar/shop' } },
  }
}

/**
 * Every product customers can order (switched on, not a fashion item), two to a row on
 * phones. `?category=<slug>` narrows the list; the chips are links, so the choice is part of
 * the address.
 */
export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { lang } = await params
  const locale = (isLocale(lang) ? lang : 'en') as Locale
  const t = getDictionary(locale)
  const { category } = await searchParams
  const { page, settings, categories, active, total, products } = await getShopPage(
    locale,
    typeof category === 'string' ? category : null,
  )

  return (
    <>
      <PageHeader settings={settings} locale={locale} t={t} />
      <PageHead
        accent={page?.accent}
        title={page?.title || t.nav.shop}
        intro={page?.intro}
        locale={locale}
      >
        {categories.length > 1 && (
          <CategoryChips
            categories={categories}
            active={active}
            total={total}
            locale={locale}
            t={t}
          />
        )}
      </PageHead>

      <section aria-label={t.nav.shop} className="grain bg-paper">
        <div className={`${container} pt-8 pb-24 lg:pt-14 lg:pb-32`}>
          {products.length > 0 ? (
            <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-4 p-0 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-8">
              {products.map((product, i) => (
                <li key={product.id}>
                  <ProductCard product={product} locale={locale} t={t} priority={i < 2} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-5">
              <EmptyNote className="text-ink-soft">
                {total > 0 ? t.shopPage.empty : t.shopSoon}
              </EmptyNote>
              {total > 0 && (
                <PillLink href={shopHref(locale)} variant="outline">
                  {t.shopPage.seeAll}
                </PillLink>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
