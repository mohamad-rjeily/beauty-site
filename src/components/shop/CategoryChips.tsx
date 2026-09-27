import Link from 'next/link'

import type { Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import type { ShopCategory } from '@/lib/cms/shop'
import { shopHref } from '@/lib/links'

import { ChipRow } from './ChipRow'

const chip =
  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-stone px-[1.125rem] text-[0.8125rem] font-semibold whitespace-nowrap text-ink no-underline transition-colors duration-[250ms] ease-[cubic-bezier(0.25,1,0.5,1)] hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper'

/**
 * The shop's category filter: plain links to ?category=<slug>, so a filtered list can be
 * shared, and Back / Forward and refresh behave like any page. The server renders the list.
 * On phones the chips scroll sideways in one row instead of wrapping into a tall block, and
 * the chosen one is brought fully into view.
 */
export function CategoryChips({
  categories,
  active,
  total,
  locale,
  t,
}: {
  categories: ShopCategory[]
  active: string | null
  total: number
  locale: Locale
  t: Dictionary
}) {
  const items = [
    { slug: null, name: t.shopPage.all, count: total },
    ...categories.map((c) => ({ slug: c.slug as string | null, name: c.name, count: c.count })),
  ]
  return (
    <ChipRow
      label={t.shopPage.categoriesLabel}
      activeKey={active ?? 'all'}
      className="motion-rise no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
      style={{ ['--i' as string]: 3 }}
    >
      {items.map((item) => (
        <Link
          key={item.slug ?? 'all'}
          href={shopHref(locale, item.slug)}
          scroll={false}
          aria-current={item.slug === active ? 'page' : undefined}
          className={chip}
        >
          {item.name}
          <span className="tabular-nums opacity-70">{item.count}</span>
        </Link>
      ))}
    </ChipRow>
  )
}
