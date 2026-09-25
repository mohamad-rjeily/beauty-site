import { Reveal } from '@/components/motion/Reveal'
import { Icon } from '@/components/ui/Icon'
import { Picture } from '@/components/ui/Picture'
import { format, type Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { ServiceGroup } from '@/lib/cms/home'
import { bookingHref, externalLinkProps } from '@/lib/links'

import { container, Emphasis, EmptyNote, SectionHeading } from './shared'

/**
 * The one terracotta field on the page: her two crafts as two staggered paper cards.
 * Each card lists the first real services of that category and the lowest real price.
 */
export function ServicesShowcase({
  heading,
  groups,
  whatsappNumber,
  locale,
  t,
}: {
  heading: string
  groups: ServiceGroup[]
  whatsappNumber?: string | null
  locale: Locale
  t: Dictionary
}) {
  const anyServices = groups.some((g) => g.names.length > 0)
  const askHref = bookingHref({ locale, whatsappNumber })

  return (
    <section
      id="services"
      aria-labelledby="services-title"
      className="grain relative overflow-x-clip bg-clay text-paper"
    >
      {/* Colour flood on entry: a limestone layer fades away (opacity only). Invisible by
          default, so the section is never covered without JavaScript. */}
      <Reveal
        variant="uncover"
        className="grain pointer-events-none absolute inset-0 bg-limestone opacity-0"
      >
        <span />
      </Reveal>

      <div className={`${container} relative grid gap-8 py-16 lg:grid-cols-12 lg:gap-10 lg:py-28`}>
        <SectionHeading id="services-title" className="lg:col-span-4 lg:self-start lg:pt-4">
          <Emphasis text={heading} />
        </SectionHeading>

        {anyServices ? (
          <ul className="m-0 flex list-none flex-col gap-5 p-0 lg:col-span-8 lg:grid lg:grid-cols-2 lg:gap-6">
            {groups.map((group, i) => (
              <Reveal
                as="li"
                key={group.category}
                variant={i === 0 ? 'fromStart' : 'fromEnd'}
                delay={i * 0.08}
                className={`w-[18.75rem] max-w-full lg:w-auto ${i === 1 ? 'self-end lg:mt-24' : ''}`}
              >
                <ServiceCard group={group} whatsappNumber={whatsappNumber} locale={locale} t={t} />
              </Reveal>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-5 lg:col-span-8">
            <EmptyNote className="text-clay-mist">
              {askHref ? t.servicesSoon : t.servicesSoonNoContact}
            </EmptyNote>
            {askHref && (
              <a
                href={askHref}
                {...externalLinkProps}
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-paper"
              >
                {t.chatOnWhatsApp} <Icon name="arrow" size={18} />
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function ServiceCard({
  group,
  whatsappNumber,
  locale,
  t,
}: {
  group: ServiceGroup
  whatsappNumber?: string | null
  locale: Locale
  t: Dictionary
}) {
  const label = t.categories[group.category]
  const href = bookingHref({ locale, whatsappNumber, subject: label })

  return (
    <article className="flex gap-3.5 rounded-card bg-paper p-2.5 text-ink shadow-on-clay">
      <Picture
        photo={group.photo}
        hint={t.photoHints[group.category]}
        soon={t.photoSoon}
        sizes="(min-width: 1024px) 12rem, 110px"
        className="aspect-[110/190] w-[6.875rem] shrink-0 rounded-t-full rounded-b-lg lg:w-40"
      />
      <div className="flex min-w-0 flex-col gap-1.5 pt-1.5">
        <h3 className="display m-0 text-2xl font-normal">{label}</h3>
        {group.names.length > 0 ? (
          <ul className="m-0 list-none p-0 text-[0.8125rem] leading-relaxed text-ink-soft">
            {group.names.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : null}
        <p className="m-0 text-[0.8125rem] font-semibold">
          {group.fromPrice
            ? format(t.fromPrice, { price: group.fromPrice })
            : href
              ? t.pricesSoon
              : t.pricesSoonNoContact}
        </p>
        {href && (
          <a
            href={href}
            {...externalLinkProps}
            className="mt-auto inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-clay no-underline hover:text-clay-deep"
          >
            {format(t.bookCategory, { category: label.toLowerCase() })}{' '}
            <Icon name="arrow" size={16} />
          </a>
        )}
      </div>
    </article>
  )
}
