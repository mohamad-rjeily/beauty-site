'use client'

import { AnimatePresence, domMax, LazyMotion, m, MotionConfig } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { BeforeAfterSlider } from '@/components/home/BeforeAfterSlider'
import { container, EmptyNote } from '@/components/home/shared'
import { ArchPhoto } from '@/components/motion/ArchPhoto'
import { ScrollRise } from '@/components/motion/ScrollRise'
import type { GalleryItem, GalleryStyle } from '@/lib/cms/pages'

/** Filter chips follow this order; only styles that have photos appear. */
const STYLE_ORDER: GalleryStyle[] = ['bridal', 'soiree', 'everyday', 'skin']

type Filter = 'all' | GalleryStyle

export type GalleryLabels = {
  all: string
  filterByStyle: string
  styles: Record<GalleryStyle, string>
  categories: Record<'makeup' | 'skincare', string>
  photos: string
  empty: string
  soon: string
  hint: string
  before: string
  after: string
  compare: string
  resultHint: string
}

/** Two columns on phones, three from lg: the stagger order is the column index. */
const useColumns = () => {
  const [cols, setCols] = useState(2)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 64rem)')
    const update = () => setCols(query.matches ? 3 : 2)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return cols
}

/**
 * The gallery: style chips, an arch grid and the before/after pairs, all following one filter.
 * - Changing the filter is a layout animation: photos that leave fade out (150ms), the ones
 *   that stay glide to their new place on a soft spring, newcomers fade up 40ms apart.
 * - Each arch rises into view with the scroll, start column first (right column in Arabic).
 * - Without JavaScript every photo is shown; reduced motion turns movement into fades.
 */
export function GalleryBrowser({
  items,
  labels,
  rtl,
  pairsHead,
}: {
  items: GalleryItem[]
  labels: GalleryLabels
  rtl: boolean
  /** Heading and note of the before/after section, rendered on the server. */
  pairsHead: ReactNode
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const cols = useColumns()

  const styles = useMemo(
    () => STYLE_ORDER.filter((style) => items.some((item) => item.style === style)),
    [items],
  )
  const shown = items.filter((item) => filter === 'all' || item.style === filter)
  const pairs = shown
    .filter((item) => item.before && item.after)
    .map((item) => ({ id: item.id, title: item.title, before: item.before, after: item.after }))

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <section aria-label={labels.photos} className="grain bg-limestone">
          <div className={`${container} flex flex-col gap-8 pb-16 lg:gap-12 lg:pb-24`}>
            {styles.length > 0 && (
              <div
                role="group"
                aria-label={labels.filterByStyle}
                className="motion-rise flex flex-wrap gap-2"
                style={{ ['--i' as string]: 3 }}
              >
                {(['all', ...styles] as Filter[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                    className="min-h-11 rounded-full border border-stone px-4 text-[0.8125rem] font-semibold text-ink transition-colors duration-[250ms] ease-[cubic-bezier(0.25,1,0.5,1)] hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
                  >
                    {key === 'all' ? labels.all : labels.styles[key]}
                  </button>
                ))}
              </div>
            )}

            {items.length === 0 ? (
              <EmptyNote className="text-ink-soft">{labels.empty}</EmptyNote>
            ) : (
              <ul className="m-0 grid list-none grid-cols-2 gap-x-3.5 gap-y-6 p-0 pb-12 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12 lg:pb-16">
                <AnimatePresence mode="popLayout" initial={false}>
                  {shown.map((item, i) => (
                    <m.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4 } }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      transition={{ layout: { type: 'spring', stiffness: 260, damping: 32 } }}
                      // The middle column sits lower (a staggered wall). `translate` is its own
                      // CSS property, so it composes with Motion's transform.
                      className={`${i % 2 === 1 ? 'max-lg:translate-y-12' : ''} ${i % 3 === 1 ? 'lg:translate-y-16' : ''}`}
                    >
                      <ScrollRise
                        order={i % cols}
                        rebind={filter}
                        as="figure"
                        className="m-0 flex flex-col gap-2"
                      >
                        <ArchPhoto
                          photo={item.after ?? item.before}
                          hint={labels.hint}
                          soon={labels.soon}
                          sizes="(min-width: 1024px) 24rem, 46vw"
                          zoom={1.04}
                          rebind={filter}
                          className="aspect-[164/220] w-full rounded-t-full rounded-b-[0.625rem] shadow-soft"
                        />
                        <figcaption className="flex flex-col gap-0.5 px-1">
                          <span className="text-[0.6875rem] font-semibold tracking-[0.14em] text-clay-deep uppercase rtl:text-xs rtl:tracking-normal">
                            {item.style
                              ? labels.styles[item.style]
                              : labels.categories[item.category]}
                          </span>
                          <span className="font-display text-[1.0625rem] leading-tight lg:text-xl">
                            {item.title}
                          </span>
                        </figcaption>
                      </ScrollRise>
                    </m.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </section>

        {pairs.length > 0 && (
          <section
            id="before-after"
            aria-labelledby="before-after-title"
            className="grain bg-limestone"
          >
            <div
              className={`${container} grid gap-6 pb-16 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-24`}
            >
              <div className="flex flex-col gap-3 lg:col-span-5">{pairsHead}</div>
              <div className="lg:col-span-6 lg:col-start-7 lg:max-w-[30rem]">
                {/* A new filter starts the slider over on its first pair, at 50%. */}
                <BeforeAfterSlider
                  key={filter}
                  pairs={pairs}
                  rtl={rtl}
                  labels={{
                    before: labels.before,
                    after: labels.after,
                    compare: labels.compare,
                    soon: labels.soon,
                    hint: labels.resultHint,
                  }}
                />
              </div>
            </div>
          </section>
        )}
      </MotionConfig>
    </LazyMotion>
  )
}
