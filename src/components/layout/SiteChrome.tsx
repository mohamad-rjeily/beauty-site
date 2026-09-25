import Link from 'next/link'

import { HideOnScrollDown } from '@/components/motion/HideOnScrollDown'
import { IdleFlag } from '@/components/motion/IdleFlag'
import { ShowOnScrollUp } from '@/components/motion/ShowOnScrollUp'
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
 * Slim header that slides in on scroll up once the visitor is past the hero, and hides on
 * scroll down: brand, language switch, Book and the menu, on paper with a soft shadow.
 */
export function CompactHeader({
  settings,
  locale,
  t,
}: {
  settings: SiteSetting
  locale: Locale
  t: Dictionary
}) {
  const otherLocale = locale === 'en' ? 'ar' : 'en'
  const book = bookingHref({ locale, whatsappNumber: settings.whatsappNumber })

  return (
    <ShowOnScrollUp className="fixed inset-x-0 top-0 z-50">
      <header className="bg-paper shadow-soft">
        <div className="mx-auto flex h-14 w-full max-w-[75rem] items-center justify-between gap-3 ps-6 pe-3 lg:ps-10 lg:pe-8">
          <Link
            href={`/${locale}`}
            className="truncate font-display text-[1.1875rem] text-ink no-underline"
          >
            {settings.brandName}
          </Link>
          <nav className="flex shrink-0 items-center gap-1">
            <Link
              href={`/${otherLocale}`}
              hrefLang={otherLocale}
              lang={otherLocale}
              aria-label={t.switchLanguageLabel}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink no-underline hover:bg-sand"
            >
              {t.switchLanguage}
            </Link>
            {book && (
              <PillLink href={book} external className="min-h-11 px-4 text-sm">
                {t.book}
              </PillLink>
            )}
            <details className="relative">
              <summary
                aria-label={t.menu}
                className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-ink hover:bg-sand [&::-webkit-details-marker]:hidden"
              >
                <Icon name="menu" size={22} />
              </summary>
              <ul className="absolute end-0 top-full z-30 m-0 mt-2 flex min-w-44 list-none flex-col rounded-card bg-paper p-2 text-ink shadow-lift">
                {(['services', 'shop', 'visit'] as const).map((key) => (
                  <li key={key}>
                    <Link
                      href={`/${locale}#${key}`}
                      className="flex min-h-11 items-center rounded-lg px-3 text-[0.9375rem] font-semibold text-ink no-underline hover:bg-sand"
                    >
                      {t.footerLinks[key]}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </nav>
        </div>
      </header>
    </ShowOnScrollUp>
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
      {chat && <IdleFlag />}
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
