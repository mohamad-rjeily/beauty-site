import type { Payload } from 'payload'

import { defaultLocale, type Locale } from '@/i18n/config'
import type { CartCheck, CartProduct } from '@/lib/cart'
import { toPhoto } from '@/lib/photo'

export const MAX_CART_LINES = 50

/**
 * Current name, price and stock of the products in a cart, in the page's language. Read with
 * the public access rules (no user, no override): a switched-off, fashion or deleted product
 * comes back as `{ id, available: false }` only, so this endpoint never reveals the name of a
 * product that isn't on sale. The cart remembers names itself, to say what was removed.
 *
 * Used by the cart page's server action (after its rate limit) and by scripts/verify-rules.ts.
 */
export const loadCartProducts = async (
  payload: Payload,
  ids: unknown,
  locale: Locale,
): Promise<CartCheck[]> => {
  const wanted = Array.isArray(ids)
    ? [...new Set(ids)]
        .filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)
        .slice(0, MAX_CART_LINES)
    : []
  if (wanted.length === 0) return []

  const found = await payload.find({
    collection: 'products',
    where: { id: { in: wanted } },
    depth: 1,
    pagination: false,
    locale,
    fallbackLocale: defaultLocale,
    overrideAccess: false,
    select: { name: true, slug: true, price: true, stock: true, images: true },
  })
  const byId = new Map(
    found.docs.map((p): [number, CartProduct] => [
      p.id,
      {
        id: p.id,
        available: true,
        name: p.name,
        slug: p.slug,
        priceCents: p.price.amount,
        stock: p.stock,
        photo: toPhoto(p.images?.[0]),
      },
    ]),
  )
  return wanted.map((id) => byId.get(id) ?? { id, available: false })
}
