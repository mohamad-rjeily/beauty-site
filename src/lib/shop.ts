import type { Where } from 'payload'

/**
 * Product types customers can see and order. Fashion items wait for size/colour variants
 * (phase 7): until then they never reach the public site, and public orders refuse them.
 */
export const PUBLIC_PRODUCT_TYPES = ['brand', 'homemade'] as const
export type PublicProductType = (typeof PUBLIC_PRODUCT_TYPES)[number]

export const isPublicProductType = (type: unknown): type is PublicProductType =>
  (PUBLIC_PRODUCT_TYPES as readonly unknown[]).includes(type)

/** Every public product query starts from this: switched on in the admin, and not fashion. */
export const publicProductWhere: Where = {
  and: [{ active: { equals: true } }, { type: { in: [...PUBLIC_PRODUCT_TYPES] } }],
}

/** How many of one product a customer can put in the cart at once. */
export const MAX_QUANTITY = 20
