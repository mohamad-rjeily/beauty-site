import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import {
  AnnouncementBar,
  CompactHeader,
  Footer,
  StickyActions,
} from '@/components/layout/SiteChrome'
import { getDictionary } from '@/i18n'
import { direction, isLocale, locales } from '@/i18n/config'
import { getSiteChrome } from '@/lib/cms/site'
import { siteUrl } from '@/lib/metadata'

import { fontVariables } from '../fonts'
import '../globals.css'

/** /en and /ar only; anything else is a 404 (the proxy redirects un-prefixed URLs). */
export const dynamicParams = false
export const generateStaticParams = () => locales.map((lang) => ({ lang }))

export const viewport: Viewport = {
  themeColor: '#f8f2f0',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const { settings, home } = await getSiteChrome(lang)
  return {
    metadataBase: siteUrl() ?? undefined,
    title: settings.brandName,
    description: home.tagline ?? undefined,
    alternates: { languages: { en: '/en', ar: '/ar' } },
  }
}

/**
 * Root layout of the public site (Payload's admin has its own root layout).
 * Sets the language and direction on <html>, so every logical CSS property and the `rtl:`
 * variants follow Arabic automatically.
 */
export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()

  const t = getDictionary(lang)
  const { settings, home } = await getSiteChrome(lang)

  return (
    // data-scroll-behavior: page changes jump to the top instantly; only in-page links glide.
    <html
      lang={lang}
      dir={direction(lang)}
      className={fontVariables}
      data-scroll-behavior="smooth"
    >
      <body className="m-0">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-ink px-5 py-3 text-paper focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        >
          {t.skipToContent}
        </a>
        <AnnouncementBar settings={settings} />
        <CompactHeader settings={settings} locale={lang} t={t} />
        <main id="main">{children}</main>
        <Footer settings={settings} home={home} locale={lang} t={t} />
        <StickyActions settings={settings} locale={lang} t={t} />
      </body>
    </html>
  )
}
