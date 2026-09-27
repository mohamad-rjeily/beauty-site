import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { defaultLocale, type Locale } from '@/i18n/config'
import { formatPrice } from '@/lib/format'
import { publicProductWhere } from '@/lib/shop'
import { WEEKDAYS, type Weekday } from '@/lib/time'
import type {
  Availability,
  Gallery,
  Home,
  Media,
  Product,
  Service,
  SiteSetting,
  Testimonial,
} from '@/payload-types'

/** A photo ready for next/image, or null when the owner hasn't uploaded one yet. */
export type Photo = { url: string; width: number; height: number; alt: string; position: string }

export const toPhoto = (media: number | Media | null | undefined): Photo | null => {
  if (!media || typeof media === 'number' || !media.url || !media.width || !media.height)
    return null
  const x = media.focalX ?? 50
  const y = media.focalY ?? 50
  return {
    url: media.url,
    width: media.width,
    height: media.height,
    alt: media.alt ?? '',
    position: `${x}% ${y}%`,
  }
}

export type ServiceGroup = {
  category: 'makeup' | 'skincare'
  names: string[]
  fromPrice: string | null
  photo: Photo | null
}

export type ResultPair = { id: number; title: string; before: Photo | null; after: Photo | null }

/** A product as every card shows it (home rail and shop grid). */
export type ProductCard = {
  id: number
  slug: string
  name: string
  category: string | null
  price: string
  priceCents: number
  stock: number
  inStock: boolean
  photo: Photo | null
}

export type Review = {
  id: number
  name: string
  quote: string
  context: string | null
  rating: number | null
}

export type HoursLine = { from: Weekday; to: Weekday; ranges: string[] }

export type HomeData = {
  home: Home
  settings: SiteSetting
  hero: Photo | null
  intro: Photo | null
  studio: (Photo | null)[]
  marquee: string[]
  services: ServiceGroup[]
  results: ResultPair[]
  products: ProductCard[]
  reviews: Review[]
  hours: HoursLine[]
}

/** How many products the home carousel shows. */
const HOME_PRODUCTS = 8

/** Mon–Sun order for display; Payload stores the weekday keys. */
const DISPLAY_ORDER: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** Groups consecutive days with identical hours: Mon–Fri 10:00–19:00, Sat 10:00–15:00. */
export const groupHours = (availability: Availability): HoursLine[] => {
  const byDay = new Map<Weekday, string[]>()
  for (const range of availability.weeklyHours ?? []) {
    if (!WEEKDAYS.includes(range.day as Weekday)) continue
    const list = byDay.get(range.day as Weekday) ?? []
    list.push(`${range.opens}–${range.closes}`)
    byDay.set(range.day as Weekday, list)
  }
  const lines: HoursLine[] = []
  for (const day of DISPLAY_ORDER) {
    const ranges = byDay.get(day)
    if (!ranges) continue
    const sorted = [...ranges].sort()
    const last = lines.at(-1)
    const previousDay = DISPLAY_ORDER[DISPLAY_ORDER.indexOf(day) - 1]
    if (last && last.to === previousDay && last.ranges.join() === sorted.join()) last.to = day
    else lines.push({ from: day, to: day, ranges: sorted })
  }
  return lines
}

/**
 * Everything the home page shows, in one round of parallel Local API calls.
 * `overrideAccess: false` applies the public access rules (no user), so inactive services,
 * hidden products and unpublished reviews can never leak onto the page.
 */
export const getHomeData = async (locale: Locale): Promise<HomeData> => {
  const payload = await getPayload({ config })
  const common = { locale, fallbackLocale: defaultLocale, overrideAccess: false } as const

  const [home, settings, availability, services, gallery, featured, reviews] = await Promise.all([
    payload.findGlobal({ slug: 'home', depth: 1, ...common }),
    payload.findGlobal({ slug: 'site-settings', depth: 0, ...common }),
    payload.findGlobal({ slug: 'availability', depth: 0, ...common }),
    payload.find({
      collection: 'services',
      where: { active: { equals: true } },
      sort: 'sortOrder',
      depth: 1,
      limit: 100,
      ...common,
    }),
    payload.find({
      collection: 'gallery',
      where: { and: [{ featured: { equals: true } }, { afterImage: { exists: true } }] },
      depth: 1,
      limit: 3,
      ...common,
    }),
    payload.find({
      collection: 'products',
      where: { and: [publicProductWhere, { featuredOnHome: { equals: true } }] },
      sort: '-updatedAt',
      depth: 1,
      limit: HOME_PRODUCTS,
      ...common,
    }),
    payload.find({
      collection: 'testimonials',
      where: { published: { equals: true } },
      sort: 'sortOrder',
      depth: 0,
      limit: 8,
      ...common,
    }),
  ])

  // Featured products first, then the newest active ones fill the carousel up to eight.
  const productDocs =
    featured.docs.length >= HOME_PRODUCTS
      ? featured.docs
      : [
          ...featured.docs,
          ...(
            await payload.find({
              collection: 'products',
              where: {
                and: [
                  publicProductWhere,
                  ...(featured.docs.length
                    ? [{ id: { not_in: featured.docs.map((p) => p.id) } }]
                    : []),
                ],
              },
              sort: '-createdAt',
              depth: 1,
              limit: HOME_PRODUCTS - featured.docs.length,
              ...common,
            })
          ).docs,
        ]

  return {
    home,
    settings,
    hero: toPhoto(home.heroPhoto),
    intro: toPhoto(home.introPhoto),
    studio: [0, 1, 2].map((i) => toPhoto(home.studioPhotos?.[i])),
    marquee: services.docs.map((s) => s.name),
    services: (['makeup', 'skincare'] as const).map((category) =>
      toGroup(category, services.docs),
    ),
    results: gallery.docs.map(toResult),
    products: productDocs.map(toProduct),
    reviews: reviews.docs.map(toReview),
    hours: groupHours(availability),
  }
}

const toGroup = (
  category: 'makeup' | 'skincare',
  docs: Service[],
): ServiceGroup => {
  const inGroup = docs.filter((s) => s.category === category)
  const cheapest = inGroup.reduce<Service | null>(
    (min, s) => (!min || s.price.amount < min.price.amount ? s : min),
    null,
  )
  return {
    category,
    names: inGroup.slice(0, 3).map((s) => s.name),
    fromPrice: cheapest
      ? formatPrice(cheapest.price.amount, cheapest.price.currency)
      : null,
    photo: inGroup.map((s) => toPhoto(s.images?.[0])).find(Boolean) ?? null,
  }
}

const toResult = (item: Gallery): ResultPair => ({
  id: item.id,
  title: item.title,
  before: toPhoto(item.beforeImage),
  after: toPhoto(item.afterImage),
})

export const toProduct = (product: Product): ProductCard => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  category: typeof product.category === 'object' && product.category ? product.category.name : null,
  price: formatPrice(product.price.amount, product.price.currency),
  priceCents: product.price.amount,
  stock: product.stock,
  inStock: product.stock > 0,
  photo: toPhoto(product.images?.[0]),
})

const toReview = (review: Testimonial): Review => ({
  id: review.id,
  name: review.clientName,
  quote: review.quote,
  context: review.context ?? null,
  rating: review.rating ?? null,
})
