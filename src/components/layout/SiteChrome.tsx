import Link from 'next/link'

import { HideOnScrollDown } from '@/components/motion/HideOnScrollDown'
import { IdleFlag } from '@/components/motion/IdleFlag'
import { ShowOnScrollUp } from '@/components/motion/ShowOnScrollUp'
import { ArchMark, Icon } from '@/components/ui/Icon'
import { PillLink } from '@/components/ui/Pill'
import { format, type Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import { bookingHref, externalLinkProps, pageHref, whatsappHref } from '@/lib/links'
import type { Home, SiteSetting } from '@/payload-types'

import { LanguageSwitch, SiteMenu } from './Nav'
import { navLabels } from './navLabels'
import { RouteSwitch } from './RouteSwitch'

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
 * Top of every page except home (whose header sits on the hero photo): brand, language,
 * Book on desktop, the shop bag and the menu, in ink on the limestone ground.
 */
export function PageHeader({
  settings,
  locale,
  t,
}: {
  settings: SiteSetting
  locale: Locale
  t: Dictionary
}) {
  const book = bookingHref({ locale })
  const labels = navLabels(t)
  return (
    <header className="mx-auto flex h-16 w-full max-w-[75rem] items-center justify-between gap-3 ps-6 pe-2 text-ink lg:px-10">
      <Link
        href={pageHref(locale, 'home')}
        className="truncate font-display text-[1.3125rem] text-ink no-underline"
      >
        {settings.brandName}
      </Link>
      <div className="flex shrink-0 items-center gap-1 lg:gap-2">
        <LanguageSwitch locale={locale} t={labels} />
        <RouteSwitch
          otherPages={
            <span className="hidden lg:inline-flex">
              <PillLink href={book} variant="outline" className="min-h-11 px-5 text-sm">
                {t.book}
              </PillLink>
            </span>
          }
        />
        <Link
          href={pageHref(locale, 'shop')}
          aria-label={t.shop}
          className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-sand"
        >
          <Icon name="bag" size={22} />
        </Link>
        <SiteMenu locale={locale} t={labels} />
      </div>
    </header>
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
  const book = bookingHref({ locale })
  const labels = navLabels(t)

  return (
    // `compact-header` lets pinned headings step down while it is shown (globals.css).
    <ShowOnScrollUp className="compact-header fixed inset-x-0 top-0 z-50">
      <header className="bg-paper shadow-soft">
        <div className="mx-auto flex h-14 w-full max-w-[75rem] items-center justify-between gap-3 ps-6 pe-3 lg:ps-10 lg:pe-8">
          <Link
            href={`/${locale}`}
            className="truncate font-display text-[1.1875rem] text-ink no-underline"
          >
            {settings.brandName}
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <LanguageSwitch locale={locale} t={labels} />
            <RouteSwitch
              otherPages={
                <PillLink href={book} className="min-h-11 px-4 text-sm">
                  {t.book}
                </PillLink>
              }
            />
            <SiteMenu locale={locale} t={labels} />
          </div>
        </div>
      </header>
    </ShowOnScrollUp>
  )
}

/**
 * Mobile: a bottom bar with Book and WhatsApp, always within thumb reach; it steps aside on a
 * fast scroll down and returns on scroll up. On the booking page itself the bar gives way to
 * a round WhatsApp button in the bottom corner. Desktop: the header carries Book, and WhatsApp
 * floats at the bottom corner. WhatsApp is not shown until a number is set.
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
  const book = bookingHref({ locale })
  const chat = settings.whatsappNumber ? whatsappHref(settings.whatsappNumber, '') : null

  const bar = (
    <nav aria-label={t.quickActions} className="motion-bar fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <HideOnScrollDown>
        <div className="flex items-center gap-2.5 bg-paper px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-bar">
          <PillLink href={book} className="flex-1">
            {t.book} <Icon name="arrow" size={18} />
          </PillLink>
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
  )

  // The booking page: no Book button pointing at itself; WhatsApp floats alone.
  const floatingChat = chat && (
    <a
      href={chat}
      {...externalLinkProps}
      aria-label={t.chatOnWhatsApp}
      className="motion-bar motion-pulse-later fixed end-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex size-[3.25rem] items-center justify-center rounded-full bg-sage text-paper shadow-lift lg:hidden"
    >
      <Icon name="whatsapp" size={24} />
    </a>
  )

  return (
    <>
      {chat && <IdleFlag />}
      <RouteSwitch bookPage={floatingChat} otherPages={bar} />

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
          {(['services', 'gallery', 'about', 'contact', 'shop'] as const).map((key) => (
            <li key={key}>
              <Link
                href={pageHref(locale, key)}
                className="inline-flex min-h-11 items-center text-limestone no-underline hover:underline"
              >
                {t.nav[key]}
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
