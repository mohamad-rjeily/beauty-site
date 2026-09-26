import { container, IsolatePlaceholders } from '@/components/home/shared'
import { PageHeader } from '@/components/layout/SiteChrome'
import { ArchPhoto } from '@/components/motion/ArchPhoto'
import { Reveal } from '@/components/motion/Reveal'
import { DrawRule, Drift, ScrollRise } from '@/components/motion/ScrollRise'
import { AccentLine, BookField, PageTitle } from '@/components/pages/shared'
import { Icon } from '@/components/ui/Icon'
import { Picture } from '@/components/ui/Picture'
import { PillLink } from '@/components/ui/Pill'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/i18n/config'
import { getAboutPage } from '@/lib/cms/pages'
import { bookingHref, pageHref } from '@/lib/links'
import { pageMetadata } from '@/lib/metadata'

/** Re-read from Payload at most once a minute. */
export const revalidate = 60

export const generateMetadata = pageMetadata('about')

/**
 * Her, in her own words. Phones read top to bottom: greeting, portrait, story. Desktop has
 * one pinned moment: the portrait stays in the start column while the story scrolls past it,
 * each paragraph fading up as it arrives.
 */
export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const locale = (isLocale(lang) ? lang : 'en') as Locale
  const t = getDictionary(locale)
  const { about, settings, portrait, hands, story } = await getAboutPage(locale)
  const book = bookingHref({ locale })
  const facts = about.facts ?? []
  const certifications = about.certifications ?? []

  return (
    <>
      <PageHeader settings={settings} locale={locale} t={t} />

      <section
        aria-labelledby="about-title"
        className="grain relative overflow-x-clip bg-limestone"
      >
        <div
          className={`${container} grid grid-cols-1 gap-y-6 pt-4 pb-16 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-10 lg:pt-12 lg:pb-28`}
        >
          <div className="flex flex-col gap-2 lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:pt-10">
            <AccentLine text={about.accent} locale={locale} />
            <PageTitle
              id="about-title"
              text={about.greeting ?? ''}
              sizeClass="text-[3.125rem] lg:text-[4.5rem]"
            />
          </div>

          {/* The pinned moment (desktop): the grid area spans both rows, so the portrait stays
              put while the story column scrolls. */}
          <div className="relative mt-4 mb-10 lg:sticky lg:top-24 lg:col-span-5 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:mb-0 lg:self-start">
            <ArchPhoto
              photo={portrait}
              hint={t.pageHints.portrait}
              soon={t.photoSoon}
              tone="dark"
              priority
              sizes="(min-width: 1024px) 34rem, 92vw"
              className="aspect-[342/460] w-full rounded-t-full rounded-b-[0.875rem] border-4 border-paper shadow-lift"
            />
            {(hands || portrait) && (
              <Drift
                distance={40}
                className="absolute -end-2 -bottom-10 size-31 lg:-end-8 lg:size-40"
              >
                <div className="size-full overflow-hidden rounded-full border-[5px] border-limestone shadow-lift">
                  <Picture
                    photo={hands}
                    hint={t.pageHints.hands}
                    soon={t.photoSoon}
                    sizes="10rem"
                    className="size-full p-2"
                  />
                </div>
              </Drift>
            )}
          </div>

          <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-7 lg:row-start-2 lg:gap-8">
            {about.opening && (
              <ScrollRise
                as="p"
                distance={24}
                className="m-0 font-display text-[1.3125rem] leading-[1.45] font-light lg:text-[1.75rem]"
              >
                <IsolatePlaceholders text={about.opening} />
              </ScrollRise>
            )}
            {about.started && <Paragraph text={about.started} />}

            {story.some(Boolean) && (
              <div className="my-1 grid grid-cols-2 items-end gap-3.5 lg:gap-6">
                {story.map((photo, i) => (
                  <ScrollRise key={i} order={i} distance={40}>
                    <ArchPhoto
                      photo={photo}
                      hint={t.pageHints.story[i]}
                      soon={t.photoSoon}
                      sizes="(min-width: 1024px) 16rem, 45vw"
                      className={`w-full rounded-t-full rounded-b-[0.625rem] shadow-soft ${
                        i === 0 ? 'aspect-[164/220]' : 'aspect-[164/180]'
                      }`}
                    />
                  </ScrollRise>
                ))}
              </div>
            )}

            {about.working && <Paragraph text={about.working} />}

            {about.quote && (
              <blockquote className="m-0 my-2 flex flex-col gap-3.5">
                <DrawRule className="h-0.5 w-12 bg-clay" />
                <ScrollRise
                  as="p"
                  distance={16}
                  className="m-0 font-display text-[1.625rem] leading-[1.3] font-light text-clay-deep italic lg:text-[2rem]"
                >
                  <IsolatePlaceholders text={about.quote} />
                </ScrollRise>
              </blockquote>
            )}

            {about.closing && <Paragraph text={about.closing} />}

            {facts.length > 0 && (
              <dl className="m-0 mt-4 grid grid-cols-3 gap-3 border-t border-line pt-5">
                {facts.map((fact, i) => (
                  <ScrollRise
                    key={fact.id}
                    order={i}
                    distance={16}
                    className="flex flex-col-reverse gap-0.5"
                  >
                    <dt className="text-xs text-ink-soft">{fact.label}</dt>
                    <dd className="m-0 font-display text-[1.625rem]">{fact.value}</dd>
                  </ScrollRise>
                ))}
              </dl>
            )}

            {certifications.length > 0 && (
              <ScrollRise distance={24}>
                <ul
                  aria-label={t.certifications}
                  className="m-0 flex list-none flex-col rounded-card bg-paper px-5 py-1 shadow-soft"
                >
                  {certifications.map((c) => (
                    <li
                      key={c.id}
                      className="flex min-h-15 items-center gap-3.5 border-t border-sand py-3 first:border-t-0"
                    >
                      <Icon name="award" size={20} className="shrink-0 text-clay-deep" />
                      <span className="flex flex-col">
                        <span className="text-[0.9375rem] font-semibold">{c.name}</span>
                        {(c.school || c.year) && (
                          <span className="text-[0.8125rem] text-ink-soft">
                            {[c.school, c.year].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </ScrollRise>
            )}

            {about.signature && (
              <Reveal variant="wipe" className="mt-2 w-fit">
                <p className="m-0 -rotate-[4deg] font-script text-[4rem] leading-none text-clay ltr:origin-left rtl:origin-right rtl:rotate-[3deg] rtl:text-[2.75rem]">
                  <IsolatePlaceholders text={about.signature} />
                </p>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {about.ctaHeading && (
        <BookField id="about-book" heading={about.ctaHeading} text={about.ctaText}>
          {book && (
            <PillLink href={book} variant="ink">
              {t.book} <Icon name="arrow" size={18} />
            </PillLink>
          )}
          <PillLink href={pageHref(locale, 'services')} variant="outlineLight">
            {t.seeServices}
          </PillLink>
        </BookField>
      )}
    </>
  )
}

function Paragraph({ text }: { text: string }) {
  return (
    <ScrollRise
      as="p"
      distance={24}
      className="m-0 max-w-[38rem] text-base leading-[1.65] text-ink-soft lg:text-[1.0625rem]"
    >
      <IsolatePlaceholders text={text} />
    </ScrollRise>
  )
}
