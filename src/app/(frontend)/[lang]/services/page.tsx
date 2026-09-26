import { container, EmptyNote } from '@/components/home/shared'
import { PageHeader } from '@/components/layout/SiteChrome'
import { SectionChips } from '@/components/pages/SectionChips'
import { AskFirst, CategorySection } from '@/components/pages/ServicesSections'
import { PageHead } from '@/components/pages/shared'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/i18n/config'
import { getServicesPage } from '@/lib/cms/pages'
import { pageMetadata } from '@/lib/metadata'

/** Re-read from Payload at most once a minute. */
export const revalidate = 60

export const generateMetadata = pageMetadata('services')

const CATEGORIES = ['makeup', 'skincare'] as const

/**
 * Every active service with its price, duration and Book button, in two groups. Makeup takes
 * the page's one terracotta field; skincare sits on limestone.
 */
export default async function ServicesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const locale = (isLocale(lang) ? lang : 'en') as Locale
  const t = getDictionary(locale)
  const { page, settings, photos, services } = await getServicesPage(locale)
  const groups = CATEGORIES.map((category) => ({
    category,
    services: services.filter((s) => s.category === category),
  })).filter((group) => group.services.length > 0)

  return (
    <>
      <PageHeader settings={settings} locale={locale} t={t} />
      <PageHead
        accent={page?.accent}
        title={page?.title ?? t.nav.services}
        intro={page?.intro}
        locale={locale}
      >
        {groups.length > 1 && (
          <SectionChips
            label={t.jumpTo}
            chips={groups.map((g) => ({
              id: g.category,
              label: t.categories[g.category],
              count: g.services.length,
            }))}
          />
        )}
      </PageHead>

      {groups.length > 0 ? (
        groups.map((group, i) => (
          <CategorySection
            key={group.category}
            category={group.category}
            tone={i === 0 ? 'clay' : 'limestone'}
            intro={group.category === 'makeup' ? page?.makeupIntro : page?.skincareIntro}
            photo={photos[group.category]}
            services={group.services}
            page={page}
            whatsappNumber={settings.whatsappNumber}
            locale={locale}
            t={t}
          />
        ))
      ) : (
        <section className="grain bg-limestone">
          <div className={`${container} pb-16`}>
            <EmptyNote className="text-ink-soft">
              {settings.whatsappNumber ? t.servicesSoon : t.servicesSoonNoContact}
            </EmptyNote>
          </div>
        </section>
      )}

      <AskFirst line={page?.askLine} whatsappNumber={settings.whatsappNumber} t={t} />
    </>
  )
}
