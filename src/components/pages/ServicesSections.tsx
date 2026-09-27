import Link from 'next/link'

import { container, Emphasis, EmptyNote, IsolatePlaceholders } from '@/components/home/shared'
import { ArchPhoto } from '@/components/motion/ArchPhoto'
import { Reveal } from '@/components/motion/Reveal'
import { ScrollRise } from '@/components/motion/ScrollRise'
import { ScrollWords } from '@/components/motion/ScrollWords'
import { Icon } from '@/components/ui/Icon'
import { formatNodes, Ltr } from '@/components/ui/Ltr'
import { PillLink } from '@/components/ui/Pill'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { Photo } from '@/lib/cms/home'
import { formatDuration, type ServiceItem } from '@/lib/cms/pages'
import { bookingHref, whatsappHref } from '@/lib/links'
import type { Page } from '@/payload-types'

type Tone = 'clay' | 'limestone'

const tones: Record<Tone, { section: string; card: string; lift: string; muted: string }> = {
  clay: {
    section: 'bg-clay text-paper',
    card: 'shadow-on-clay',
    lift: 'before:shadow-[0_2px_4px_rgb(60_22_8/0.22),0_16px_32px_rgb(60_22_8/0.26),0_40px_72px_rgb(60_22_8/0.2)]',
    muted: 'text-paper',
  },
  limestone: {
    section: 'bg-limestone text-ink',
    card: 'shadow-soft',
    lift: 'before:shadow-lift',
    muted: 'text-ink-soft',
  },
}

/**
 * One category of services. Phones: the category title pins to the top of the screen while
 * its list scrolls under it (a slim bar in the section's own colour). Desktop: the whole
 * start column (title, line, arch photo) stays pinned beside the list.
 */
export function CategorySection({
  category,
  tone,
  intro,
  photo,
  services,
  page,
  locale,
  t,
}: {
  category: 'makeup' | 'skincare'
  tone: Tone
  intro?: string | null
  photo: Photo | null
  services: ServiceItem[]
  page: Page['services']
  locale: Locale
  t: Dictionary
}) {
  const style = tones[tone]
  const slots = services.filter((s) => s.mode === 'slot')
  const requests = services.filter((s) => s.mode === 'request')
  const titleId = `${category}-title`

  return (
    <section
      id={category}
      aria-labelledby={titleId}
      className={`grain relative overflow-x-clip ${style.section}`}
    >
      {tone === 'clay' && (
        // Colour flood on entry: a limestone layer fades away (opacity only; invisible without JS).
        <Reveal
          variant="uncover"
          className="grain pointer-events-none absolute inset-0 bg-limestone opacity-0"
        >
          <span />
        </Reveal>
      )}

      <div
        className={`${container} relative grid grid-cols-1 gap-7 pt-12 pb-18 lg:grid-cols-12 lg:gap-10 lg:py-24`}
      >
        {/* Below lg this wrapper is `display: contents`, so the title bar's sticky range is the
            whole section; from lg the wrapper itself is the pinned column. */}
        <div className="flex flex-col gap-6 max-lg:contents lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
          <div
            className={`grain pin-under-header sticky top-0 z-10 -mx-6 px-6 py-3 lg:static lg:m-0 lg:bg-transparent lg:bg-none lg:p-0 ${style.section}`}
          >
            <ScrollWords
              id={titleId}
              text={t.categories[category]}
              className="display m-0 text-[2.75rem] leading-[1.05] lg:text-[3.75rem]"
            />
          </div>
          <div className="flex items-end justify-between gap-4 lg:flex-col lg:items-start lg:gap-8">
            {intro && (
              <p className={`m-0 max-w-[30ch] text-[0.9375rem] lg:text-lg ${style.muted}`}>
                <IsolatePlaceholders text={intro} />
              </p>
            )}
            <ScrollRise distance={24} className="shrink-0 lg:w-full lg:max-w-[17rem]">
              <ArchPhoto
                photo={photo}
                hint={t.photoHints[category]}
                soon={t.photoSoon}
                sizes="(min-width: 1024px) 17rem, 120px"
                className={`aspect-[88/124] rounded-t-full rounded-b-lg border-paper lg:w-full ${
                  tone === 'clay'
                    ? 'w-[5.5rem] border-[3px] shadow-on-clay'
                    : 'w-[7.5rem] border-4 shadow-lift'
                }`}
              />
            </ScrollRise>
          </div>
        </div>

        <div className="flex flex-col gap-7 lg:col-span-8 lg:gap-10">
          {slots.length > 0 && (
            <ul
              className={`m-0 flex list-none flex-col rounded-card bg-paper px-5 py-0 text-ink ${style.card}`}
            >
              {slots.map((service) => (
                <ScrollRise
                  as="li"
                  key={service.id}
                  distance={16}
                  className="border-t border-sand first:border-t-0"
                >
                  <ServiceRow
                    service={service}
                    href={bookingHref({ locale, service: service.slug })}
                    t={t}
                  />
                </ScrollRise>
              ))}
            </ul>
          )}

          {requests.length > 0 && (
            <div className="flex flex-col gap-5">
              <div className="mt-4 flex flex-col gap-3 lg:mt-0">
                {page?.requestHeading && (
                  <ScrollWords
                    as="h3"
                    text={page.requestHeading}
                    className="display m-0 text-[2rem] leading-[1.05] lg:text-[2.5rem]"
                  />
                )}
                {page?.requestNote && (
                  <p className={`m-0 max-w-[40ch] text-[0.9375rem] ${style.muted}`}>
                    <IsolatePlaceholders text={page.requestNote} />
                  </p>
                )}
              </div>
              <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2 lg:gap-6">
                {requests.map((service, i) => (
                  <ScrollRise
                    as="li"
                    key={service.id}
                    from={i % 2 === 0 ? 'start' : 'end'}
                    className="flex"
                  >
                    <RequestCard
                      service={service}
                      href={bookingHref({ locale, service: service.slug })}
                      tone={tone}
                      t={t}
                    />
                  </ScrollRise>
                ))}
              </ul>
            </div>
          )}

          {services.length === 0 && (
            <EmptyNote className={style.muted}>{t.categoryEmpty}</EmptyNote>
          )}
        </div>
      </div>
    </section>
  )
}

function ServiceRow({ service, href, t }: { service: ServiceItem; href: string; t: Dictionary }) {
  return (
    <article className="flex flex-col gap-2 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="display m-0 text-[1.375rem] leading-[1.1] font-normal lg:text-2xl">
          {service.name}
        </h3>
        <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">
          <Ltr>{service.price}</Ltr>
        </span>
      </div>
      {service.description.map((line, i) => (
        <p key={i} className="m-0 max-w-[52ch] text-sm leading-relaxed text-ink-soft">
          {line}
        </p>
      ))}
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-soft">
          <Icon name="clock" size={16} />
          <span className="sr-only">{t.duration}: </span>
          {formatDuration(service.duration, t)}
        </span>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-clay no-underline hover:text-clay-deep"
        >
          {t.bookShort}
          <span className="sr-only">: {service.name}</span>
          <Icon name="arrow" size={16} />
        </Link>
      </div>
    </article>
  )
}

/**
 * Bridal and event services: no time to pick. The card says so, shows a starting price, and
 * sends a request (the whole card is the link, like the home service cards).
 */
function RequestCard({
  service,
  href,
  tone,
  t,
}: {
  service: ServiceItem
  href: string
  tone: Tone
  t: Dictionary
}) {
  const style = tones[tone]
  const interactive = `isolate transition-[translate,scale] duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] before:absolute before:inset-0 before:-z-10 before:rounded-card before:opacity-0 before:transition-opacity before:duration-300 hover:-translate-y-1 hover:before:opacity-100 active:scale-[0.98] active:duration-[140ms] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 ${style.lift}`

  return (
    <article
      className={`relative flex w-full gap-3.5 rounded-card bg-paper p-2.5 text-ink ${style.card} ${interactive}`}
    >
      <ArchPhoto
        photo={service.photo}
        hint={t.photoHints.makeup}
        soon={t.photoSoon}
        sizes="(min-width: 1024px) 10rem, 110px"
        zoom={1.05}
        className="aspect-[110/196] w-[6.875rem] shrink-0 rounded-t-full rounded-b-lg lg:w-36"
      />
      <div className="flex min-w-0 grow flex-col items-start gap-1.5 pt-1.5 pe-1">
        <span className="rounded-full bg-clay-mist px-2.5 py-0.5 text-[0.6875rem] font-semibold text-clay-deep rtl:text-xs">
          {t.byRequest}
        </span>
        <h3 className="display m-0 text-[1.375rem] leading-[1.1] font-normal">{service.name}</h3>
        {service.description.slice(0, 2).map((line, i) => (
          <p key={i} className="m-0 text-[0.8125rem] leading-normal text-ink-soft">
            {line}
          </p>
        ))}
        <p className="m-0 text-[0.8125rem] font-semibold">
          {formatNodes(t.fromPrice, { price: <Ltr>{service.price}</Ltr> })}
        </p>
        <Link
          href={href}
          className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-clay px-4 text-sm font-semibold text-paper no-underline transition-colors after:absolute after:inset-0 after:rounded-card hover:bg-clay-deep"
        >
          {t.sendRequest}
          <span className="sr-only">: {service.name}</span>
        </Link>
      </div>
    </article>
  )
}

/** Closing line of the Services page: not sure? Ask on WhatsApp (sage: the WhatsApp colour). */
export function AskFirst({
  line,
  whatsappNumber,
  t,
}: {
  line?: string | null
  whatsappNumber?: string | null
  t: Dictionary
}) {
  if (!whatsappNumber) return null
  return (
    <section className="grain bg-limestone">
      <ScrollRise
        distance={24}
        className={`${container} flex flex-col items-start gap-5 pb-24 lg:flex-row lg:items-center lg:justify-between lg:pb-28`}
      >
        {line && (
          <p className="m-0 max-w-[22ch] font-display text-2xl leading-snug font-light lg:text-[2rem]">
            <Emphasis text={line} />
          </p>
        )}
        <PillLink href={whatsappHref(whatsappNumber, '')} external variant="sage">
          <Icon name="whatsapp" size={20} /> {t.askOnWhatsApp}
        </PillLink>
      </ScrollRise>
    </section>
  )
}
