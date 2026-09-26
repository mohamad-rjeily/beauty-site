import { PageHeader } from '@/components/layout/SiteChrome'
import { ScrollWords } from '@/components/motion/ScrollWords'
import { GalleryBrowser } from '@/components/pages/GalleryBrowser'
import { BookField, PageHead } from '@/components/pages/shared'
import { Icon } from '@/components/ui/Icon'
import { PillLink } from '@/components/ui/Pill'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/i18n/config'
import { getGalleryPage } from '@/lib/cms/pages'
import { bookingHref } from '@/lib/links'
import { pageMetadata } from '@/lib/metadata'

/** Re-read from Payload at most once a minute. */
export const revalidate = 60

export const generateMetadata = pageMetadata('gallery')

/** Her work: style filters, the arch grid, before/after pairs, and a Book band. */
export default async function GalleryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const locale = (isLocale(lang) ? lang : 'en') as Locale
  const t = getDictionary(locale)
  const { page, settings, items } = await getGalleryPage(locale)
  const book = bookingHref({ locale })

  return (
    <>
      <PageHeader settings={settings} locale={locale} t={t} />
      <PageHead
        accent={page?.accent}
        title={page?.title ?? t.nav.gallery}
        intro={page?.intro}
        locale={locale}
      />

      <GalleryBrowser
        items={items}
        rtl={locale === 'ar'}
        labels={{
          all: t.all,
          filterByStyle: t.filterByStyle,
          styles: t.styles,
          categories: t.categories,
          photos: t.photos,
          empty: t.galleryEmpty,
          soon: t.photoSoon,
          hint: t.pageHints.gallery,
          before: t.before,
          after: t.after,
          compare: t.compare,
          resultHint: t.photoHints.result,
        }}
        pairsHead={
          <>
            <ScrollWords
              id="before-after-title"
              text={page?.beforeAfterHeading ?? t.resultsEmptyHeading}
              className="display m-0 text-[2.5rem] lg:text-[3.75rem]"
            />
            {page?.beforeAfterNote && (
              <p className="m-0 text-sm text-ink-soft lg:text-base">{page.beforeAfterNote}</p>
            )}
          </>
        }
      />

      {book && page?.ctaHeading && (
        <BookField id="gallery-book" heading={page.ctaHeading} text={page.ctaText}>
          <PillLink href={book} variant="ink">
            {t.book} <Icon name="arrow" size={18} />
          </PillLink>
        </BookField>
      )}
    </>
  )
}
