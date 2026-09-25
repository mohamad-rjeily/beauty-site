import Link from 'next/link'

import { Parallax } from '@/components/motion/Parallax'
import { Icon } from '@/components/ui/Icon'
import { Picture } from '@/components/ui/Picture'
import { PillLink } from '@/components/ui/Pill'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { Photo } from '@/lib/cms/home'
import { externalLinkProps } from '@/lib/links'
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
  locale,
  t,
}: {
  home: Home
  photo: Photo | null
  brandName: string
  bookHref: string | null
  locale: Locale
  t: Dictionary
}) {
  const otherLocale = locale === 'en' ? 'ar' : 'en'
  const lines = [home.headlineLine1, home.headlineLine2, home.headlineLine3]

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate [--photo-h:38.75rem] pb-28 lg:[--photo-h:min(78vh,46rem)] lg:pb-24"
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
              className="absolute inset-0 justify-start! pt-[42%]"
            />
          </div>
        </Parallax>
      </div>

      <header className={`${container} flex h-16 items-center justify-between text-paper`}>
        <Link href={`/${locale}`} className="font-display text-[1.3125rem] text-paper no-underline">
          {brandName}
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href={`/${otherLocale}`}
            hrefLang={otherLocale}
            lang={otherLocale}
            aria-label={t.switchLanguageLabel}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-paper no-underline hover:bg-paper/10"
          >
            {t.switchLanguage}
          </Link>
          {bookHref && (
            <span className="hidden lg:inline-flex">
              <PillLink
                href={bookHref}
                external
                variant="outlineLight"
                className="min-h-11 px-5 text-sm"
              >
                {t.book}
              </PillLink>
            </span>
          )}
        </nav>
      </header>

      <div className={`${container} relative flow-root`}>
        {bookHref && (
          <a
            href={bookHref}
            {...externalLinkProps}
            aria-label={t.bookBadgeLabel}
            className="absolute end-5 top-[calc(var(--photo-h)-24rem)] flex size-27 items-center justify-center rounded-full bg-clay text-paper shadow-lift transition-transform duration-200 active:scale-[0.96] lg:end-10 lg:size-36"
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
                fontSize="10.5"
                letterSpacing={locale === 'ar' ? 0 : 2}
                fontWeight={600}
                direction="ltr"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <textPath href="#badge-ring">{t.bookBadgeRing}</textPath>
              </text>
            </svg>
            <Icon name="arrowUpEnd" size={28} />
          </a>
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

        {home.tagline && (
          <p className="m-0 mt-5 text-sm text-ink-soft lg:text-base">{home.tagline}</p>
        )}
      </div>
    </section>
  )
}
