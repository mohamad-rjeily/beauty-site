import { Icon } from '@/components/ui/Icon'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { Review } from '@/lib/cms/home'
import { externalLinkProps } from '@/lib/links'

import { ReviewDeck } from './ReviewDeck'
import { container, Emphasis, EmptyNote, SectionHeading } from './shared'

/** Published reviews only. None yet: say so, and point to Instagram where her work already lives. */
export function Reviews({
  heading,
  reviews,
  instagramUrl,
  locale,
  t,
}: {
  heading: string
  reviews: Review[]
  instagramUrl?: string | null
  locale: Locale
  t: Dictionary
}) {
  return (
    <section aria-labelledby="reviews-title" className="grain bg-sand">
      <div
        className={`${container} grid gap-6 pt-16 pb-28 lg:grid-cols-12 lg:gap-10 lg:pt-21 lg:pb-30`}
      >
        <SectionHeading id="reviews-title" className="lg:col-span-5">
          <Emphasis text={heading} />
        </SectionHeading>

        <div className="lg:col-span-6 lg:col-start-7 lg:max-w-[34rem]">
          {reviews.length > 0 ? (
            <ReviewDeck
              reviews={reviews}
              rtl={locale === 'ar'}
              labels={{
                previous: t.previousReview,
                next: t.nextReview,
                reviewOf: t.reviewOf,
                stars: t.stars,
              }}
            />
          ) : (
            <div className="flex flex-col items-start gap-4">
              <EmptyNote className="text-ink-soft">{t.reviewsSoon}</EmptyNote>
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  {...externalLinkProps}
                  className="inline-flex min-h-11 items-center gap-2 font-semibold text-clay-deep"
                >
                  <Icon name="instagram" size={18} /> {t.followInstagram}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
