import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { defaultLocale, intlLocale, type Locale } from '@/i18n/config'
import { publicProductWhere, type PublicProductType } from '@/lib/shop'
import { BUSINESS_TIME_ZONE } from '@/lib/time'
import type { Category, Product } from '@/payload-types'

import { toPhoto, toProduct, type Photo, type ProductCard } from './home'
import { richTextParagraphs } from './pages'

const common = (locale: Locale) =>
  ({ locale, fallbackLocale: defaultLocale, overrideAccess: false }) as const

export type ShopCategory = { slug: string; name: string; count: number }

const categoryOf = (product: Product): Category | null =>
  typeof product.category === 'object' && product.category ? product.category : null

/**
 * The shop page: every public product (switched on, not a fashion item), newest first, and
 * the categories that have at least one of them. `category` narrows the list to one
 * category; an unknown slug shows everything. One query: a small shop has a few dozen
 * products, so counting and filtering happen here rather than in more round trips.
 */
export const getShopPage = async (locale: Locale, category: string | null) => {
  const payload = await getPayload({ config })
  const [pages, settings, products] = await Promise.all([
    payload.findGlobal({ slug: 'pages', depth: 0, ...common(locale) }),
    payload.findGlobal({ slug: 'site-settings', depth: 0, ...common(locale) }),
    payload.find({
      collection: 'products',
      where: publicProductWhere,
      sort: '-createdAt',
      depth: 1,
      limit: 200,
      ...common(locale),
    }),
  ])

  const counts = new Map<string, ShopCategory>()
  for (const product of products.docs) {
    const c = categoryOf(product)
    if (!c?.slug) continue
    const entry = counts.get(c.slug) ?? { slug: c.slug, name: c.name, count: 0 }
    entry.count += 1
    counts.set(c.slug, entry)
  }
  const categories = [...counts.values()].sort((a, b) => a.name.localeCompare(b.name, locale))
  const active = category && counts.has(category) ? category : null

  return {
    page: pages.shop,
    settings,
    categories,
    active,
    total: products.docs.length,
    products: products.docs
      .filter((p) => !active || categoryOf(p)?.slug === active)
      .map(toProduct),
  }
}

/** "12 October 2026" (Beirut calendar day) for a stored date. */
const formatDate = (value: string | null | undefined, locale: Locale): string | null =>
  value
    ? new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: BUSINESS_TIME_ZONE,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(value))
    : null

export type ShopProduct = ProductCard & {
  type: PublicProductType
  stock: number
  categorySlug: string | null
  photos: Photo[]
  description: string[]
  brand: string | null
  size: string | null
  howToUse: string | null
  homemade: {
    ingredients: string | null
    madeOn: string | null
    expiresOn: string | null
    storage: string | null
    usage: string | null
    patchTest: string | null
  } | null
}

/**
 * One public product by its slug, or null (unknown, switched off, or a fashion item).
 * Cached per request: the page and its metadata ask for the same product.
 */
export const getShopProduct = cache(
  async (locale: Locale, slug: string): Promise<ShopProduct | null> => {
    const payload = await getPayload({ config })
    const found = await payload.find({
      collection: 'products',
      where: { and: [publicProductWhere, { slug: { equals: slug } }] },
      depth: 1,
      limit: 1,
      ...common(locale),
    })
    const product = found.docs[0]
    if (!product || (product.type !== 'brand' && product.type !== 'homemade')) return null

    const h = product.homemade
    return {
      ...toProduct(product),
      type: product.type,
      stock: product.stock,
      categorySlug: categoryOf(product)?.slug ?? null,
      photos: (product.images ?? []).map(toPhoto).filter((p): p is Photo => p !== null),
      description: richTextParagraphs(product.description),
      brand: product.type === 'brand' ? (product.brand ?? null) : null,
      size: product.type === 'brand' ? (product.size ?? null) : null,
      howToUse: product.type === 'brand' ? (product.howToUse ?? null) : null,
      homemade:
        product.type === 'homemade'
          ? {
              ingredients: h?.ingredients ?? null,
              madeOn: formatDate(h?.madeOn, locale),
              expiresOn: formatDate(h?.expiresOn, locale),
              storage: h?.storageInstructions ?? null,
              usage: h?.usageInstructions ?? null,
              patchTest: h?.patchTestNote ?? null,
            }
          : null,
    }
  },
)
