'use server'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { defaultLocale, isLocale } from '@/i18n/config'
import type { CartProduct } from '@/lib/cart'
import { toPhoto } from '@/lib/cms/home'
import { withinLimit, type Limit } from '@/lib/rateLimit'
import { isPublicProductType } from '@/lib/shop'

/** Opening the cart re-checks it; changing quantities doesn't. Generous, only stops scraping. */
const CART: Limit = { bucket: 'cart', perVisitor: 120, siteWide: 2000, windowSeconds: 600 }
const MAX_LINES = 50

export type CartProductsResult =
  | { ok: true; products: CartProduct[] }
  | { ok: false; reason: 'rateLimited' | 'error' }

/**
 * Current name, price, stock and availability of the products in a cart, in the page's
 * language. A public endpoint: it answers only what the shop shows anyway. Products that are
 * switched off or not sold on the site come back as unavailable (with their name, so the cart
 * can say what was removed); ids that don't exist are simply missing.
 */
export async function getCartProducts(ids: unknown, locale: unknown): Promise<CartProductsResult> {
  const wanted = Array.isArray(ids)
    ? [...new Set(ids)].filter((id): id is number => Number.isInteger(id) && id > 0).slice(0, MAX_LINES)
    : []
  if (wanted.length === 0) return { ok: true, products: [] }
  const lang = typeof locale === 'string' && isLocale(locale) ? locale : defaultLocale

  const payload = await getPayload({ config })
  try {
    if (!(await withinLimit(payload, CART, await headers()))) return { ok: false, reason: 'rateLimited' }
    const found = await payload.find({
      collection: 'products',
      where: { id: { in: wanted } },
      depth: 1,
      limit: MAX_LINES,
      pagination: false,
      locale: lang,
      fallbackLocale: defaultLocale,
      // Switched-off products are admin-only; only their name leaves the server.
      overrideAccess: true,
      select: { name: true, slug: true, price: true, stock: true, active: true, type: true, images: true },
    })
    return {
      ok: true,
      products: found.docs.map((p) => {
        const available = Boolean(p.active) && isPublicProductType(p.type)
        return {
          id: p.id,
          available,
          name: p.name,
          slug: available ? p.slug : '',
          priceCents: available ? p.price.amount : 0,
          stock: available ? p.stock : 0,
          photo: available ? toPhoto(p.images?.[0]) : null,
        }
      }),
    }
  } catch (error) {
    payload.logger.error(`Cart check failed: ${(error as Error)?.name ?? 'unknown error'}`)
    return { ok: false, reason: 'error' }
  }
}
