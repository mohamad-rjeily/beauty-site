import Link from 'next/link'

import { HideOnScrollDown } from '@/components/motion/HideOnScrollDown'
import { ArchMark, Icon } from '@/components/ui/Icon'
import { PillLink } from '@/components/ui/Pill'
import { format, type Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import { bookingHref, externalLinkProps, whatsappHref } from '@/lib/links'
import type { Home, SiteSetting } from '@/payload-types'

/** Owner-controlled message bar at the very top; hidden unless switched on with text. */
export function AnnouncementBar({ settings }: { settings: SiteSetting }) {
  const bar = settings.announcementBar
  if (!bar?.enabled || !bar.text) return null
  const inner = <span className="text-[0.8125rem] font-semibold">{bar.text}</span>
  return (
    <div className="bg-ink px-6 py-2.5 text-center text-paper">
      {bar.link ? (
        <a href={bar.link} className="text-paper">
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  )
}

/**
 * Mobile: a bottom bar with Book and WhatsApp, always within thumb reach; it steps aside on a
 * fast scroll down and returns on scroll up. Desktop: the header carries Book, and WhatsApp
 * floats at the bottom corner. Buttons without a destination (no number yet) are not shown.
 */
export function StickyActions({
  settings,
  locale,
  t,
}: {
  settings: SiteSetting
  locale: Locale
  t: Dictionary
}) {
  const book = bookingHref({ locale, whatsappNumber: settings.whatsappNumber })
  const chat = settings.whatsappNumber ? whatsappHref(settings.whatsappNumber, '') : null
  if (!book && !chat) return null

  return (
    <>
      <nav
        aria-label={t.quickActions}
        className="motion-bar fixed inset-x-0 bottom-0 z-40 lg:hidden"
      >
        <HideOnScrollDown>
          <div className="flex items-center gap-2.5 bg-paper px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-bar">
            {book && (
              <PillLink href={book} external className="flex-1">
                {t.book} <Icon name="arrow" size={18} />
              </PillLink>
            )}
            {chat && (
              <a
                href={chat}
                {...externalLinkProps}
                aria-label={t.chatOnWhatsApp}
                className="motion-pulse-later relative flex size-[3.25rem] shrink-0 items-center justify-center rounded-full bg-sage text-paper"
              >
                <Icon name="whatsapp" size={24} />
              </a>
            )}
          </div>
        </HideOnScrollDown>
      </nav>

      {chat && (
        <a
          href={chat}
          {...externalLinkProps}
          aria-label={t.chatOnWhatsApp}
          className="motion-pulse-later fixed end-6 bottom-6 z-40 hidden h-14 items-center gap-2.5 rounded-full bg-sage ps-4 pe-5 text-sm font-semibold text-paper no-underline shadow-lift transition-transform hover:-translate-y-0.5 lg:flex"
        >
          <Icon name="whatsapp" size={22} /> {t.whatsapp}
        </a>
      )}
    </>
  )
}

export function Footer({
  settings,
  home,
  locale,
  t,
}: {
  settings: SiteSetting
  home: Home
  locale: Locale
  t: Dictionary
}) {
  const year = new Date().getFullYear()
  return (
    <footer className="grain bg-earth text-limestone">
      <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-3.5 px-6 pt-12 pb-28 lg:px-10 lg:pb-16">
        <ArchMark className="text-earth-soft" />
        <p className="m-0 font-display text-[2.125rem]">{settings.brandName}</p>
        {home.signature && (
          <p className="m-0 font-script text-[2.5rem] leading-none text-clay-tint rtl:text-[1.875rem]">
            {home.footerSignoff} {home.signature}
          </p>
        )}
        <ul className="m-0 flex list-none flex-wrap gap-x-6 p-0 text-sm font-semibold">
          {(['services', 'shop', 'visit'] as const).map((key) => (
            <li key={key}>
              <Link
                href={`/${locale}#${key}`}
                className="inline-flex min-h-11 items-center text-limestone no-underline hover:underline"
              >
                {t.footerLinks[key]}
              </Link>
            </li>
          ))}
        </ul>
        <p className="m-0 text-xs text-earth-soft">
          {format(t.footerRights, { year, brand: settings.brandName })}
        </p>
      </div>
    </footer>
  )
}
