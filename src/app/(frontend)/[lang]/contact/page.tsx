import type { ReactNode } from 'react'

import { container } from '@/components/home/shared'
import { PageHeader } from '@/components/layout/SiteChrome'
import { ArchPhoto } from '@/components/motion/ArchPhoto'
import { Reveal } from '@/components/motion/Reveal'
import { ScrollRise } from '@/components/motion/ScrollRise'
import { ScrollWords } from '@/components/motion/ScrollWords'
import { FaqList } from '@/components/pages/FaqList'
import { AccentLine, PageTitle } from '@/components/pages/shared'
import { Icon, type IconName } from '@/components/ui/Icon'
import { PillLink } from '@/components/ui/Pill'
import { getDictionary, type Dictionary } from '@/i18n'
import { isLocale, type Locale } from '@/i18n/config'
import { getContactPage, type DayHours } from '@/lib/cms/pages'
import { formatPhone } from '@/lib/format'
import { externalLinkProps, whatsappHref } from '@/lib/links'
import { pageMetadata } from '@/lib/metadata'

/** Re-read from Payload at most once a minute (this also moves the "Today" mark). */
export const revalidate = 60

export const generateMetadata = pageMetadata('contact')

/**
 * Where, when and how to reach her: the map arch and contact rows, the week's hours on the
 * page's terracotta field (today marked), and the FAQ. Each row appears only when the owner
 * has filled it in.
 */
export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const locale = (isLocale(lang) ? lang : 'en') as Locale
  const t = getDictionary(locale)
  const { page, settings, map, hours, faq } = await getContactPage(locale)
  const chat = settings.whatsappNumber ? whatsappHref(settings.whatsappNumber, '') : null
  const handle = settings.instagramUrl
    ?.replace(/^https:\/\/(www\.)?instagram\.com\//, '')
    .replace(/\/$/, '')

  const mapFrame = (
    <ArchPhoto
      photo={map}
      hint={t.pageHints.map}
      soon={t.photoSoon}
      priority
      zoom={1.05}
      sizes="(min-width: 1024px) 40rem, 92vw"
      className="aspect-[342/320] w-full rounded-t-full rounded-b-[0.875rem] border-4 border-paper shadow-lift lg:aspect-[4/3.4]"
    />
  )

  return (
    <>
      <PageHeader settings={settings} locale={locale} t={t} />

      <section aria-labelledby="contact-title" className="grain bg-limestone">
        <div
          className={`${container} grid grid-cols-1 gap-y-5 pt-5 pb-16 lg:grid-cols-12 lg:gap-x-10 lg:pt-12 lg:pb-24`}
        >
          <div className="flex flex-col gap-4 lg:col-span-12">
            <AccentLine text={page?.accent} locale={locale} />
            <PageTitle id="contact-title" text={page?.title ?? t.nav.contact} />
          </div>

          <div className="relative mt-3 lg:col-span-7 lg:mt-6">
            {settings.mapLink ? (
              <a
                href={settings.mapLink}
                {...externalLinkProps}
                aria-label={t.openMap}
                className="block"
              >
                {mapFrame}
              </a>
            ) : (
              mapFrame
            )}
            {page?.areaLabel && (
              <span className="motion-pop absolute start-4 bottom-4 inline-flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-2 text-[0.8125rem] font-semibold text-ink shadow-soft">
                <Icon name="pin" size={16} className="text-sage" />
                <bdi>{page.areaLabel}</bdi>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-5 lg:col-span-5 lg:mt-6 lg:self-end">
            <ul className="m-0 flex list-none flex-col rounded-card bg-paper px-5 py-1 shadow-soft">
              {settings.locationText && (
                <Row order={0} icon="pin" label={t.address}>
                  <span className="whitespace-pre-line">{settings.locationText}</span>
                </Row>
              )}
              {chat && settings.whatsappNumber && (
                <Row order={1} icon="whatsapp" label={t.whatsapp} href={chat} external>
                  <span dir="ltr" className="tabular-nums">
                    {formatPhone(settings.whatsappNumber)}
                  </span>
                </Row>
              )}
              {settings.instagramUrl && (
                <Row
                  order={2}
                  icon="instagram"
                  label={t.instagram}
                  href={settings.instagramUrl}
                  external
                >
                  <span dir="ltr">@{handle}</span>
                </Row>
              )}
            </ul>
            {settings.mapLink && (
              <PillLink href={settings.mapLink} external variant="outline">
                {t.directions} <Icon name="arrowUpEnd" size={18} />
              </PillLink>
            )}
          </div>
        </div>
      </section>

      <HoursField heading={page?.hoursHeading} note={page?.hoursNote} hours={hours} t={t} />

      {faq.length > 0 && (
        <section id="faq" aria-labelledby="faq-title" className="grain bg-limestone">
          <div
            className={`${container} grid grid-cols-1 gap-6 pt-16 pb-24 lg:grid-cols-12 lg:gap-10 lg:py-28`}
          >
            <div className="lg:col-span-4">
              <ScrollWords
                id="faq-title"
                text={page?.faqHeading ?? ''}
                className="display m-0 text-[2.5rem] lg:sticky lg:top-24 lg:text-[3.75rem]"
              />
            </div>
            <div className="flex flex-col gap-6 lg:col-span-7 lg:col-start-6">
              <FaqList items={faq} />
              {chat && (
                <p className="m-0 text-[0.9375rem] text-ink-soft">
                  {t.anotherQuestion}{' '}
                  <a
                    href={chat}
                    {...externalLinkProps}
                    className="inline-flex min-h-11 items-center font-semibold text-clay-deep"
                  >
                    {t.askOnWhatsApp}
                  </a>
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

/** The page's one terracotta field: every weekday on a paper card, today marked. */
function HoursField({
  heading,
  note,
  hours,
  t,
}: {
  heading?: string | null
  note?: string | null
  hours: DayHours[]
  t: Dictionary
}) {
  return (
    <section
      id="hours"
      aria-labelledby="hours-title"
      className="grain relative overflow-x-clip bg-clay text-paper"
    >
      <Reveal
        variant="uncover"
        className="grain pointer-events-none absolute inset-0 bg-limestone opacity-0"
      >
        <span />
      </Reveal>
      <div
        className={`${container} relative grid grid-cols-1 gap-5 pt-16 pb-18 lg:grid-cols-12 lg:items-start lg:gap-10 lg:py-24`}
      >
        <div className="flex flex-col gap-3 lg:col-span-5">
          <ScrollWords
            id="hours-title"
            text={heading ?? t.hours}
            className="display m-0 text-[2.5rem] lg:text-[3.75rem]"
          />
          {note && <p className="m-0 max-w-[34ch] text-[0.9375rem] lg:text-lg">{note}</p>}
        </div>
        <ScrollRise distance={24} className="lg:col-span-6 lg:col-start-7">
          <dl className="m-0 flex flex-col rounded-card bg-paper px-5 py-1.5 text-ink shadow-on-clay">
            {hours.map((day) => (
              <div
                key={day.day}
                className={`flex min-h-12 items-center justify-between gap-4 border-t border-sand py-2 text-[0.9375rem] first:border-t-0 ${
                  day.today ? 'font-semibold' : ''
                }`}
              >
                <dt className="flex items-center gap-2.5">
                  {t.weekdays[day.day]}
                  {day.today && (
                    <span className="rounded-full bg-clay-mist px-2.5 py-0.5 text-[0.6875rem] text-clay-deep rtl:text-xs">
                      {t.today}
                    </span>
                  )}
                </dt>
                <dd className={`m-0 text-end ${day.today ? '' : 'text-ink-soft'}`}>
                  {day.ranges.length > 0 ? (
                    <span dir="ltr" className="tabular-nums">
                      {day.ranges.join(', ')}
                    </span>
                  ) : (
                    t.closed
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </ScrollRise>
      </div>
    </section>
  )
}

function Row({
  order,
  icon,
  label,
  href,
  external,
  children,
}: {
  order: number
  icon: IconName
  label: string
  href?: string
  external?: boolean
  children: ReactNode
}) {
  const content = (
    <>
      <Icon name={icon} size={20} className="mt-0.5 shrink-0 text-sage" />
      <span className="flex flex-col">
        <span className="text-xs text-ink-soft">{label}</span>
        <span className="text-[0.9375rem]">{children}</span>
      </span>
    </>
  )
  const className = 'flex min-h-15 items-start gap-3.5 py-3.5 text-ink no-underline'
  return (
    <ScrollRise
      as="li"
      order={order}
      distance={16}
      className="border-t border-sand first:border-t-0"
    >
      {href ? (
        <a href={href} className={className} {...(external ? externalLinkProps : {})}>
          {content}
        </a>
      ) : (
        <div className={className}>{content}</div>
      )}
    </ScrollRise>
  )
}
