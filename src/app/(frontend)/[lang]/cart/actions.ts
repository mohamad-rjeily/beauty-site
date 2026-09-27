'use server'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { defaultLocale, isLocale } from '@/i18n/config'
import type { CartCheck } from '@/lib/cart'
import { loadCartProducts } from '@/lib/cartProducts'
import { withinLimit, type Limit } from '@/lib/rateLimit'

/** Opening the cart re-checks it; changing quantities doesn't. Generous, only stops scraping. */
const CART: Limit = { bucket: 'cart', perVisitor: 120, siteWide: 2000, windowSeconds: 600 }

export type CartProductsResult =
  | { ok: true; products: CartCheck[] }
  | { ok: false; reason: 'rateLimited' | 'error' }

/**
 * The cart page's check of its products (see lib/cartProducts.ts). A public endpoint: it
 * answers only what the shop shows anyway, and nothing about products that aren't on sale.
 */
export async function getCartProducts(ids: unknown, locale: unknown): Promise<CartProductsResult> {
  const lang = typeof locale === 'string' && isLocale(locale) ? locale : defaultLocale
  const payload = await getPayload({ config })
  try {
    if (!(await withinLimit(payload, CART, await headers()))) return { ok: false, reason: 'rateLimited' }
    return { ok: true, products: await loadCartProducts(payload, ids, lang) }
  } catch (error) {
    payload.logger.error(`Cart check failed: ${(error as Error)?.name ?? 'unknown error'}`)
    return { ok: false, reason: 'error' }
  }
}
