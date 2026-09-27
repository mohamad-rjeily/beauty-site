import Link from 'next/link'

import { LanguageSwitch, SiteMenu } from '@/components/layout/Nav'
import { navLabels } from '@/components/layout/navLabels'
import { cartLabels } from '@/components/layout/SiteChrome'
import { Parallax } from '@/components/motion/Parallax'
import { Icon } from '@/components/ui/Icon'
import { Picture } from '@/components/ui/Picture'
import { PillLink } from '@/components/ui/Pill'
import { CartBag } from '@/components/shop/CartBag'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { Photo } from '@/lib/cms/home'
import { cartHref } from '@/lib/links'
import type { Home } from '@/payload-types'

import { container } from './shared'

/**
 * First viewport: full-bleed portrait, an oversized three-line headline whose last line
 * crosses the photo's edge onto the limestone, and the rotating Book badge.
 *
 * Layout trick: the headline's top margin is (photo height − two headline lines), in the
 * headline's own `em`, so lines 1–2 always sit on the photo and line 3 below it, at every
 * font size and in both scripts (Arabic has a taller line height).
 */
export function Hero({
  home,
  photo,
  brandName,
  bookHref,
  hasWhatsApp,
  locale,
  t,
}: {
  home: Home
  photo: Photo | null
  brandName: string
  bookHref: string | null
  /** The fixed desktop WhatsApp pill exists (a number is set): the tagline row makes room. */
  hasWhatsApp: boolean
  locale: Locale
  t: Dictionary
}) {
  const otherLocale = locale === 'en' ? 'ar' : 'en'
  const lines = [home.headlineLine1, home.headlineLine2, home.headlineLine3]
  const labels = navLabels(t)

  return (
    <section
      aria-labelledby="hero-title"
      data-hero
      className="grain relative isolate bg-limestone [--photo-h:38.75rem] pb-28 lg:[--photo-h:min(78vh,46rem)] lg:pb-18"
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-(--photo-h) overflow-hidden bg-earth">
        <Parallax className="absolute inset-0">
          <div className="motion-hero-photo absolute inset-0">
            <Picture
              photo={photo}
              hint={t.photoHints.hero}
              soon={t.photoSoon}
              sizes="100vw"
              tone="dark"
              priority
              className="absolute inset-0 justify-start! pt-[min(42%,12rem)]"
            />
          </div>
        </Parallax>
      </div>

      <header className={`${container} flex h-16 items-center justify-between text-paper`}>
        <Link href={`/${locale}`} className="font-display text-[1.3125rem] text-paper no-underline">
          {brandName}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitch locale={locale} t={labels} tone="light" />
          {bookHref && (
            <span className="hidden lg:inline-flex">
              <PillLink href={bookHref} variant="outlineLight" className="min-h-11 px-5 text-sm">
                {t.book}
              </PillLink>
            </span>
          )}
          <CartBag href={cartHref(locale)} locale={locale} labels={cartLabels(t)} tone="light" />
          <SiteMenu locale={locale} t={labels} tone="light" />
        </div>
      </header>

      <div className={`${container} relative flow-root`}>
        {bookHref && (
          <Link
            href={bookHref}
            aria-label={t.bookBadgeLabel}
            className="absolute end-5 top-[calc(var(--photo-h)-24rem)] flex size-27 items-center justify-center rounded-full bg-clay text-paper shadow-lift transition-transform duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] active:duration-[140ms] lg:end-10 lg:size-36"
          >
            <svg
              viewBox="0 0 108 108"
              className="motion-spin absolute inset-0 size-full"
              aria-hidden="true"
            >
              <defs>
                <path id="badge-ring" d="M54,54 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0" />
              </defs>
              <text
                fill="currentColor"
                fontSize={locale === 'ar' ? 9.6 : 10.5}
                letterSpacing={locale === 'ar' ? 0 : 2}
                fontWeight={600}
                direction="ltr"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {/* Latin letters are spaced to close the ring exactly (2π·40 ≈ 251). Arabic is a
                    joined script, so spacing it would break the letters apart: its phrase and size
                    are chosen to fill the ring instead. */}
                <textPath
                  href="#badge-ring"
                  {...(locale === 'ar' ? {} : { textLength: 250, lengthAdjust: 'spacing' })}
                >
                  {t.bookBadgeRing}
                </textPath>
              </text>
            </svg>
            <Icon name="arrowUpEnd" size={28} />
          </Link>
        )}

        <h1
          id="hero-title"
          className="display m-0 mt-[calc(var(--photo-h)-4rem-2*var(--leading-display)*1em)] text-[5.5rem] lg:text-[6rem]"
        >
          {lines.map((line, i) => (
            <span
              key={i}
              style={{ ['--i' as string]: i }}
              className={`motion-rise block ${i < 2 ? 'text-paper [text-shadow:0_2px_24px_rgb(42_37_33/0.35)]' : 'text-clay'}`}
            >
              {i === 2 ? <em className="italic">{line}</em> : line}
            </span>
          ))}
        </h1>

        {(home.tagline || home.accentLine) && (
          // Room for the fixed desktop WhatsApp pill only when it exists.
          <div
            className={`mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 ${hasWhatsApp ? 'lg:pe-44' : ''}`}
          >
            {home.tagline && (
              <p className="m-0 text-sm text-ink-soft lg:text-base">{home.tagline}</p>
            )}
            {home.accentLine && (
              <p
                lang={otherLocale}
                dir={otherLocale === 'ar' ? 'rtl' : 'ltr'}
                className={`m-0 text-sage ${
                  otherLocale === 'ar'
                    ? 'font-[family-name:var(--font-amiri)] text-xl'
                    : 'font-[family-name:var(--font-fraunces)] text-lg italic'
                }`}
              >
                {home.accentLine}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
