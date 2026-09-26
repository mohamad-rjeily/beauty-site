import type { Metadata } from 'next'

import { BookingFlow } from '@/components/booking/BookingFlow'
import { container, EmptyNote } from '@/components/home/shared'
import { PageHeader } from '@/components/layout/SiteChrome'
import { PageHead } from '@/components/pages/shared'
import { Icon } from '@/components/ui/Icon'
import { PillLink } from '@/components/ui/Pill'
import { format, getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/i18n/config'
import { formatDuration, getBookingPage, getInitialSlots } from '@/lib/cms/pages'
import { getSiteChrome } from '@/lib/cms/site'
import { whatsappHref } from '@/lib/links'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const { settings } = await getSiteChrome(lang)
  return {
    title: `${getDictionary(lang).booking.navTitle} · ${settings.brandName}`,
    alternates: { languages: { en: '/en/book', ar: '/ar/book' } },
  }
}

/**
 * The booking page: choose a service, then a time (or send a request for bridal and events),
 * then name and phone. `?service=<slug>` opens with that service chosen; every Book button on
 * the site links here through bookingHref().
 */
export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { lang } = await params
  const locale = (isLocale(lang) ? lang : 'en') as Locale
  const t = getDictionary(locale)
  const { service: slug } = await searchParams
  const { settings, ownerName, maxDaysAhead, services } = await getBookingPage(locale)

  const bookable = services.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    category: s.category,
    mode: s.mode,
    price: s.price,
    durationLabel: formatDuration(s.duration, t),
  }))
  const initial = bookable.find((s) => s.slug === slug) ?? null
  // A link to a time-slot service arrives with its free times already on the page.
  const initialDays = initial?.mode === 'slot' ? await getInitialSlots(initial.id) : null

  return (
    <>
      <PageHeader settings={settings} locale={locale} t={t} />
      <PageHead
        accent={t.booking.accent}
        title={t.booking.title}
        intro={format(t.booking.intro, { name: ownerName })}
        locale={locale}
      />
      <section className="grain bg-limestone">
        <div className={`${container} pb-24 lg:pb-32`}>
          {bookable.length > 0 ? (
            <BookingFlow
              services={bookable}
              initialServiceId={initial?.id ?? null}
              initialDays={initialDays}
              ownerName={ownerName}
              whatsappNumber={settings.whatsappNumber || null}
              maxDaysAhead={maxDaysAhead}
              locale={locale}
              t={t}
            />
          ) : (
            <div className="flex flex-col items-start gap-5">
              <EmptyNote className="text-ink-soft">{t.booking.servicesEmpty}</EmptyNote>
              {settings.whatsappNumber && (
                <PillLink href={whatsappHref(settings.whatsappNumber, '')} external variant="sage">
                  <Icon name="whatsapp" size={20} /> {t.askOnWhatsApp}
                </PillLink>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
