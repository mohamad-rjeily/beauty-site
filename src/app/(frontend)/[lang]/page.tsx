import { Hero } from '@/components/home/Hero'
import { Intro } from '@/components/home/Intro'
import { ProductRail } from '@/components/home/ProductRail'
import { Results } from '@/components/home/Results'
import { Reviews } from '@/components/home/Reviews'
import { ServicesMarquee } from '@/components/home/ServicesMarquee'
import { ServicesShowcase } from '@/components/home/ServicesShowcase'
import { Visit } from '@/components/home/Visit'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/i18n/config'
import { getHomeData } from '@/lib/cms/home'
import { bookingHref } from '@/lib/links'

/** Re-read from Payload at most once a minute; instant refresh on save comes later. */
export const revalidate = 60

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const locale = (isLocale(lang) ? lang : 'en') as Locale
  const t = getDictionary(locale)
  const data = await getHomeData(locale)
  const { home, settings } = data
  const whatsappNumber = settings.whatsappNumber

  return (
    <>
      <Hero
        home={home}
        photo={data.hero}
        brandName={settings.brandName}
        bookHref={bookingHref({ locale, whatsappNumber })}
        locale={locale}
        t={t}
      />
      <ServicesMarquee names={data.marquee} label={t.footerLinks.services} />
      <Intro home={home} photo={data.intro} t={t} />
      <ServicesShowcase
        heading={home.servicesHeading ?? ''}
        groups={data.services}
        whatsappNumber={whatsappNumber}
        locale={locale}
        t={t}
      />
      <Results
        heading={home.resultsHeading ?? ''}
        note={home.resultsNote}
        pairs={data.results}
        locale={locale}
        t={t}
      />
      <ProductRail
        heading={home.shopHeading ?? ''}
        products={data.products}
        whatsappNumber={whatsappNumber}
        locale={locale}
        t={t}
      />
      <Reviews
        heading={home.reviewsHeading ?? ''}
        reviews={data.reviews}
        instagramUrl={settings.instagramUrl}
        locale={locale}
        t={t}
      />
      <Visit
        heading={home.visitHeading ?? ''}
        settings={settings}
        hours={data.hours}
        studio={data.studio}
        t={t}
      />
    </>
  )
}
