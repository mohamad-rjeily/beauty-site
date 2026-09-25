import { Reveal } from '@/components/motion/Reveal'
import { Picture } from '@/components/ui/Picture'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { Photo } from '@/lib/cms/home'
import type { Home } from '@/payload-types'

import { container, IsolatePlaceholders } from './shared'

/**
 * Her introduction. The arch photo breaks the grid: it rises over the marquee's edge.
 * The facts row appears only when the owner enters real facts in the admin.
 */
export function Intro({
  home,
  photo,
  locale,
  t,
}: {
  home: Home
  photo: Photo | null
  locale: Locale
  t: Dictionary
}) {
  const facts = home.facts ?? []

  return (
    <section aria-labelledby="intro-title" className="grain relative bg-limestone">
      <div
        className={`${container} relative grid gap-y-5 pt-12 pb-16 lg:grid-cols-12 lg:gap-x-10 lg:pt-24 lg:pb-28`}
      >
        <Reveal
          variant="riseFar"
          className="absolute end-6 -top-14 z-10 w-[9.375rem] lg:static lg:order-2 lg:col-span-5 lg:col-start-8 lg:-mt-40 lg:w-full lg:max-w-[24rem] lg:justify-self-end"
        >
          <div className="overflow-hidden rounded-t-full rounded-b-lg border-4 border-paper shadow-lift">
            <Picture
              photo={photo}
              hint={t.photoHints.intro}
              soon={t.photoSoon}
              sizes="(min-width: 1024px) 24rem, 150px"
              className="aspect-[150/220] w-full"
            />
          </div>
        </Reveal>

        <div className="flex flex-col gap-5 lg:order-1 lg:col-span-7 lg:gap-7">
          {home.introAccent && (
            // Written in the other script, so its own direction is reversed: `text-end` puts it on
            // the page's reading-start side, above the greeting and clear of the arch.
            <p
              lang={locale === 'ar' ? 'en' : 'ar'}
              dir={locale === 'ar' ? 'ltr' : 'rtl'}
              className={`-mb-3 text-sage ${
                locale === 'ar'
                  ? 'm-0 text-end font-[family-name:var(--font-fraunces)] text-xl italic'
                  : 'm-0 text-end font-[family-name:var(--font-amiri)] text-[1.625rem]'
              }`}
            >
              {home.introAccent}
            </p>
          )}
          <h2
            id="intro-title"
            className="display m-0 min-h-[7.5rem] max-w-[10.5rem] text-[1.625rem] leading-[1.15] max-lg:rtl:text-[1.5rem] lg:min-h-0 lg:max-w-none lg:text-[3rem]"
          >
            <IsolatePlaceholders text={home.introGreeting ?? ''} />
          </h2>

          {home.introText && (
            <Reveal variant="rise">
              <p className="m-0 mt-4 max-w-[34ch] font-display text-[1.3125rem] leading-[1.45] font-light lg:mt-0 lg:text-[1.75rem]">
                {home.introText}
              </p>
            </Reveal>
          )}

          {home.signature && (
            <Reveal variant="wipe" delay={0.3} className="w-fit">
              <p className="m-0 -rotate-[4deg] font-script text-[4rem] leading-none text-clay ltr:origin-left rtl:origin-right rtl:rotate-[3deg] rtl:text-[2.75rem]">
                <IsolatePlaceholders text={home.signature} />
              </p>
            </Reveal>
          )}

          {facts.length > 0 && (
            <dl className="m-0 grid grid-cols-3 gap-3 border-t border-line pt-5">
              {facts.map((fact) => (
                <div key={fact.id} className="flex flex-col-reverse gap-0.5">
                  <dt className="text-xs text-ink-soft">{fact.label}</dt>
                  <dd className="m-0 font-display text-[1.625rem]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  )
}
