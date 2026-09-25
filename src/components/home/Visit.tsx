import type { ReactNode } from 'react'

import { Reveal } from '@/components/motion/Reveal'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Picture } from '@/components/ui/Picture'
import { PillLink } from '@/components/ui/Pill'
import type { Dictionary } from '@/i18n'
import type { HoursLine, Photo } from '@/lib/cms/home'
import { formatPhone } from '@/lib/format'
import { externalLinkProps } from '@/lib/links'
import type { SiteSetting } from '@/payload-types'

import { container, Emphasis, SectionHeading } from './shared'

/**
 * Where and when. Three arches (after Lebanese triple-arch windows) rise over the reviews'
 * edge; the middle one is taller. Every contact row appears only when the owner filled it in.
 */
export function Visit({
  heading,
  settings,
  hours,
  studio,
  t,
}: {
  heading: string
  settings: SiteSetting
  hours: HoursLine[]
  studio: (Photo | null)[]
  t: Dictionary
}) {
  const dayRange = (line: HoursLine) =>
    line.from === line.to ? t.days[line.from] : `${t.days[line.from]}–${t.days[line.to]}`

  return (
    <section aria-labelledby="visit-title" id="visit" className="grain relative bg-limestone">
      <div className={`${container} grid gap-6 pb-16 lg:grid-cols-12 lg:gap-10 lg:pb-28`}>
        <div className="relative z-10 -mt-[4.375rem] grid grid-cols-3 items-end gap-2 lg:col-span-7 lg:-mt-28 lg:gap-3">
          {studio.map((photo, i) => (
            <Reveal key={i} variant="riseFar" delay={i === 1 ? 0 : 0.1}>
              <div
                className={`overflow-hidden rounded-t-full rounded-b-md border-[3px] border-limestone ${i === 1 ? 'shadow-lift' : 'shadow-soft'}`}
              >
                <Picture
                  photo={photo}
                  hint={t.photoHints.studio[i]}
                  soon={t.photoSoon}
                  sizes="(min-width: 1024px) 14rem, 33vw"
                  className={`w-full ${i === 1 ? 'aspect-[3/7]' : 'aspect-[3/5]'}`}
                />
              </div>
            </Reveal>
          ))}
        </div>

        <div className="flex flex-col gap-5 lg:col-span-5 lg:self-end">
          <SectionHeading id="visit-title">
            <Emphasis text={heading} />
          </SectionHeading>

          <div className="flex flex-col rounded-card bg-paper px-5 py-2 shadow-soft">
            {settings.locationText && (
              <Row icon="pin" label={t.address}>
                <span className="whitespace-pre-line">{settings.locationText}</span>
              </Row>
            )}
            <Row icon="clock" label={t.hours}>
              {hours.length > 0 ? (
                <span className="flex flex-col">
                  {hours.map((line) => (
                    <span key={line.from}>
                      {dayRange(line)} ·{' '}
                      <span className="tabular-nums" dir="ltr">
                        {line.ranges.join(', ')}
                      </span>
                    </span>
                  ))}
                </span>
              ) : (
                t.byAppointment
              )}
            </Row>
            {settings.whatsappNumber && (
              <Row icon="phone" label={t.phone} href={`tel:${settings.whatsappNumber}`}>
                <span dir="ltr" className="tabular-nums">
                  {formatPhone(settings.whatsappNumber)}
                </span>
              </Row>
            )}
            {settings.instagramUrl && (
              <Row icon="instagram" label={t.instagram} href={settings.instagramUrl} external>
                <span dir="ltr">
                  @
                  {settings.instagramUrl
                    .replace(/^https:\/\/(www\.)?instagram\.com\//, '')
                    .replace(/\/$/, '')}
                </span>
              </Row>
            )}
          </div>

          {settings.mapLink && (
            <PillLink href={settings.mapLink} external variant="outline">
              {t.directions}
            </PillLink>
          )}
        </div>
      </div>
    </section>
  )
}

function Row({
  icon,
  label,
  href,
  external,
  children,
}: {
  icon: IconName
  label: string
  href?: string
  external?: boolean
  children: ReactNode
}) {
  const content = (
    <>
      <Icon name={icon} size={20} className="mt-0.5 text-sage" />
      <span className="sr-only">{label}: </span>
      <span className="text-[0.9375rem]">{children}</span>
    </>
  )
  const className =
    'flex min-h-14 items-start gap-3.5 border-b border-sand py-4 last:border-b-0 text-ink no-underline'
  return href ? (
    <a href={href} className={className} {...(external ? externalLinkProps : {})}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  )
}
