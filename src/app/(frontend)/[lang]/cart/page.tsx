import type { Metadata } from 'next'

import { container } from '@/components/home/shared'
import { PageHeader } from '@/components/layout/SiteChrome'
import { PageTitle } from '@/components/pages/shared'
import { CartView } from '@/components/shop/CartView'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/i18n/config'
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
    title: `${getDictionary(lang).cart.open} · ${settings.brandName}`,
    // Each visitor's own cart: nothing for search engines.
    robots: { index: false, follow: true },
    alternates: { languages: { en: '/en/cart', ar: '/ar/cart' } },
  }
}

/**
 * The cart. Its contents live in this browser (localStorage), so the page itself is the
 * same for everyone; the cart view fills in after it has checked prices with the server.
 */
export default async function CartPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const locale = (isLocale(lang) ? lang : 'en') as Locale
  const t = getDictionary(locale)
  const { settings } = await getSiteChrome(locale)

  return (
    <>
      <PageHeader settings={settings} locale={locale} t={t} />
      <section className="grain min-h-[70svh] bg-limestone">
        <div className={`${container} flex flex-col gap-6 pt-5 pb-24 lg:max-w-[48rem] lg:pt-12 lg:pb-32`}>
          <PageTitle text={t.cart.title} sizeClass="text-[3rem] lg:text-[4.5rem]" />
          <CartView locale={locale} t={t} shopHref={shopHref(locale)} />
        </div>
      </section>
    </>
  )
}
