import { Picture } from '@/components/ui/Picture'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { ResultPair } from '@/lib/cms/home'

import { BeforeAfterSlider } from './BeforeAfterSlider'
import { container, Emphasis, EmptyNote, SectionHeading } from './shared'

/** Real before/after pairs marked "featured" in the gallery. No pairs yet: an honest empty arch. */
export function Results({
  heading,
  note,
  pairs,
  locale,
  t,
}: {
  heading: string
  note?: string | null
  pairs: ResultPair[]
  locale: Locale
  t: Dictionary
}) {
  return (
    <section aria-labelledby="results-title" id="results" className="grain bg-limestone">
      <div
        className={`${container} grid gap-6 py-16 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-21`}
      >
        <div className="flex flex-col gap-3 lg:col-span-5">
          <SectionHeading id="results-title">
            {pairs.length > 0 ? <Emphasis text={heading} /> : t.resultsEmptyHeading}
          </SectionHeading>
          {note && pairs.length > 0 && (
            <p className="m-0 text-sm text-ink-soft lg:text-base">{note}</p>
          )}
        </div>

        <div className="lg:col-span-6 lg:col-start-7 lg:max-w-[30rem]">
          {pairs.length > 0 ? (
            <BeforeAfterSlider
              pairs={pairs}
              rtl={locale === 'ar'}
              labels={{
                before: t.before,
                after: t.after,
                compare: t.compare,
                soon: t.photoSoon,
                hint: t.photoHints.result,
              }}
            />
          ) : (
            <figure className="m-0 flex flex-col gap-4">
              <Picture
                photo={null}
                hint={t.photoHints.result}
                soon={t.photoSoon}
                sizes="90vw"
                className="aspect-[342/420] w-full rounded-t-full rounded-b-[0.875rem] lg:aspect-[4/5]"
              />
              <figcaption>
                <EmptyNote className="text-ink-soft">{t.resultsSoon}</EmptyNote>
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </section>
  )
}
