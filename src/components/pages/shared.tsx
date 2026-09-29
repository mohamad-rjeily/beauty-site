import type { ReactNode } from 'react'

import { container } from '@/components/home/shared'
import { Reveal } from '@/components/motion/Reveal'
import { ScrollRise } from '@/components/motion/ScrollRise'
import { ScrollWords } from '@/components/motion/ScrollWords'
import type { Locale } from '@/i18n/config'
import { hasPlaceholder, splitEmphasis } from '@/lib/emphasis'

/**
 * A short line in the other script (Arabic on English pages, and the reverse), in garnet. It
 * carries its own language and direction; `text-end` in its own direction puts it on the
 * page's reading-start side.
 */
export function AccentLine({
  text,
  locale,
  className = '',
}: {
  text?: string | null
  locale: Locale
  className?: string
}) {
  if (!text) return null
  const other = locale === 'ar' ? 'en' : 'ar'
  return (
    <p
      lang={other}
      dir={other === 'ar' ? 'rtl' : 'ltr'}
      className={`m-0 text-end text-clay-deep ${
        other === 'ar'
          ? 'font-[family-name:var(--font-amiri)] text-2xl leading-snug'
          : 'font-[family-name:var(--font-fraunces)] text-xl italic'
      } ${className}`}
    >
      {text}
    </p>
  )
}

/**
 * The page title (h1). On load each part rises 24px, 120ms apart (CSS, runs without
 * JavaScript); starred parts are italic in clay. Words stay whole, so it wraps naturally.
 */
export function PageTitle({
  text,
  id,
  sizeClass = 'text-[3.75rem] lg:text-[5.5rem]',
  className = '',
}: {
  text: string
  id?: string
  /** Font size classes; replaces the default rather than competing with it. */
  sizeClass?: string
  className?: string
}) {
  return (
    <h1 id={id} className={`display m-0 ${sizeClass} ${className}`}>
      {splitEmphasis(text).map((part, i) => {
        const words = part.text.split(/(\s+)/).map((word, w) =>
          /^\s+$/.test(word) || !word ? (
            word
          ) : (
            <span key={w} className="motion-rise inline-block" style={{ ['--i' as string]: i }}>
              {hasPlaceholder(word) ? <bdi>{word}</bdi> : word}
            </span>
          ),
        )
        return part.em ? (
          <em key={i} className="text-clay italic">
            {words}
          </em>
        ) : (
          <span key={i}>{words}</span>
        )
      })}
    </h1>
  )
}

/** The top of a page: accent line, title, intro line, and anything after (chips). */
export function PageHead({
  accent,
  title,
  intro,
  locale,
  children,
}: {
  accent?: string | null
  title: string
  intro?: string | null
  locale: Locale
  children?: ReactNode
}) {
  return (
    <section className="grain bg-limestone">
      <div className={`${container} flex flex-col gap-4 pt-5 pb-10 lg:gap-6 lg:pt-12 lg:pb-16`}>
        <AccentLine text={accent} locale={locale} />
        <PageTitle text={title} className="max-w-[14ch]" />
        {intro && (
          <p
            className="motion-rise m-0 max-w-[34ch] text-[0.9375rem] text-ink-soft lg:text-lg"
            style={{ ['--i' as string]: 2 }}
          >
            {intro}
          </p>
        )}
        {children}
      </div>
    </section>
  )
}

/**
 * The page's one rose field, closing the page with a Book action: clay floods in (a
 * limestone layer fades away), the heading reveals word by word, the actions follow.
 */
export function BookField({
  id,
  heading,
  text,
  children,
}: {
  id: string
  heading: string
  text?: string | null
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="grain relative overflow-x-clip bg-clay text-paper">
      <Reveal
        variant="uncover"
        className="grain pointer-events-none absolute inset-0 bg-limestone opacity-0"
      >
        <span />
      </Reveal>
      <div
        className={`${container} relative grid gap-4 pt-16 pb-18 lg:grid-cols-12 lg:items-end lg:gap-10 lg:py-24`}
      >
        <div className="flex flex-col gap-4 lg:col-span-7">
          <ScrollWords
            id={id}
            text={heading}
            className="display m-0 text-[2.5rem] lg:text-[3.75rem]"
          />
          {text && <p className="m-0 max-w-[34ch] text-[0.9375rem] lg:text-lg">{text}</p>}
        </div>
        <ScrollRise
          order={1}
          distance={24}
          className="mt-2 flex flex-col gap-2.5 lg:col-span-4 lg:col-start-9 lg:mt-0"
        >
          {children}
        </ScrollRise>
      </div>
    </section>
  )
}
