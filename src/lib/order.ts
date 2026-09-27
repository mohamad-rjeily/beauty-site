import { ValidationError, type Payload } from 'payload'
import { z } from 'zod'

import { defaultLocale, isLocale, type Locale } from '@/i18n/config'
import { generateOrderNumber } from '@/lib/orderNumber'
import type { SavedOrder } from '@/lib/orderMessage'
import { phoneSchema } from '@/lib/phone'
import { withinLimit, type Limit } from '@/lib/rateLimit'
import { MAX_QUANTITY } from '@/lib/shop'
import type { Order } from '@/payload-types'

/**
 * The public checkout, on the server. Used by the cart page's server action and by
 * scripts/verify-rules.ts, so it takes `payload` and the request headers instead of reading
 * them itself.
 *
 * The order is created through the Local API WITHOUT a user: the order hooks then apply
 * every public rule (status "new", prices and names from the database, only products on sale,
 * quantities within stock, no stock taken until the owner confirms).
 */

export const ORDER_LIMIT: Limit = { bucket: 'order', perVisitor: 5, siteWide: 60, windowSeconds: 600 }

const text = (max: number) => z.string().trim().max(max).optional().default('')

const orderInput = z
  .object({
    /** One per checkout attempt (the page makes it): a second tap finds the first order. */
    checkoutId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
    locale: z.string().refine(isLocale),
    name: z.string().trim().min(2).max(80),
    phone: phoneSchema,
    fulfillment: z.enum(['delivery', 'pickup']),
    area: text(120),
    street: text(160),
    building: text(120),
    floor: text(40),
    landmark: text(200),
    notes: text(1000),
    items: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          quantity: z.number().int().min(1).max(MAX_QUANTITY),
        }),
      )
      .min(1)
      .max(50),
  })
  .refine((v) => v.fulfillment !== 'delivery' || v.area.length > 0, { path: ['area'] })
  .refine((v) => v.fulfillment !== 'delivery' || v.street.length > 0, { path: ['street'] })

export type OrderField = 'name' | 'phone' | 'area' | 'street' | 'building' | 'floor' | 'landmark' | 'notes'
const FIELDS = new Set<string>(['name', 'phone', 'area', 'street', 'building', 'floor', 'landmark', 'notes'])
const FIELD_OF: Record<string, OrderField> = { customerName: 'name' }

export type OrderResult =
  | { ok: true; order: SavedOrder }
  | { ok: false; reason: 'invalid'; fields: OrderField[] }
  /** A product was taken off sale, sold out or has fewer left: check the cart again. */
  | { ok: false; reason: 'cartChanged' }
  | { ok: false; reason: 'rateLimited' }
  | { ok: false; reason: 'error' }

/** True for a unique-index violation on one of the orders table's columns. */
const isUniqueViolation = (error: unknown, field: 'checkoutId' | 'orderNumber'): boolean => {
  if (error instanceof ValidationError) {
    return error.data.errors.some((e) => e.path === field)
  }
  const column = field === 'checkoutId' ? 'checkout_id' : 'order_number'
  let current: unknown = error
  for (let depth = 0; current && depth < 5; depth++) {
    const c = current as { code?: unknown; constraint?: unknown; detail?: unknown; cause?: unknown }
    if (c.code === '23505') {
      return String(c.constraint ?? '').includes(column) || String(c.detail ?? '').includes(column)
    }
    current = c.cause
  }
  return false
}

/** What the customer's page needs of a saved order: its snapshot, never re-read prices. */
const toSaved = (doc: Order): SavedOrder => ({
  number: doc.orderNumber ?? '',
  lines: (doc.items ?? []).map((item) => ({
    name: item.productName ?? '',
    quantity: item.quantity,
    unitCents: item.unitPrice?.amount ?? 0,
    lineCents: item.lineTotal?.amount ?? 0,
  })),
  deliveryFeeCents: doc.deliveryFee?.amount ?? null,
  totalCents: doc.total?.amount ?? 0,
  fulfillment: doc.fulfillment,
  address:
    doc.fulfillment === 'delivery'
      ? {
          area: doc.area ?? '',
          street: doc.street ?? '',
          building: doc.building ?? '',
          floor: doc.floor ?? '',
          landmark: doc.landmark ?? '',
        }
      : null,
  name: doc.customerName,
  phone: doc.phone,
  notes: doc.notes ?? '',
})

const findByCheckoutId = async (payload: Payload, checkoutId: string): Promise<Order | null> =>
  (
    await payload.find({
      collection: 'orders',
      where: { checkoutId: { equals: checkoutId } },
      depth: 0,
      limit: 1,
      // Orders are admin-only; this server code reads back the customer's own order.
      overrideAccess: true,
    })
  ).docs[0] ?? null

/**
 * Validates the checkout, applies the honeypot and the rate limit, and saves the order.
 * `website` is a honeypot: a field people never see. When a bot fills it, the answer looks
 * like success (with a made-up number) but nothing is saved.
 */
export const placeOrder = async (
  payload: Payload,
  raw: unknown,
  headers: { get: (name: string) => string | null },
): Promise<OrderResult> => {
  const honeypot = (raw as { website?: unknown } | null)?.website
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return {
      ok: true,
      order: {
        number: generateOrderNumber(),
        lines: [],
        deliveryFeeCents: null,
        totalCents: 0,
        fulfillment: 'pickup',
        address: null,
        name: '',
        phone: '',
        notes: '',
      },
    }
  }

  try {
    if (!(await withinLimit(payload, ORDER_LIMIT, headers))) return { ok: false, reason: 'rateLimited' }
  } catch (error) {
    payload.logger.error(`Order rate limit failed: ${(error as Error)?.name ?? 'unknown error'}`)
    return { ok: false, reason: 'error' }
  }

  const parsed = orderInput.safeParse(raw)
  if (!parsed.success) {
    const paths = parsed.error.issues.map((i) => String(i.path[0]))
    if (paths.some((p) => p === 'items')) return { ok: false, reason: 'cartChanged' }
    const fields = [...new Set(paths.filter((p) => FIELDS.has(p)))] as OrderField[]
    return fields.length ? { ok: false, reason: 'invalid', fields } : { ok: false, reason: 'error' }
  }
  const v = parsed.data
  const locale = v.locale as Locale

  // The same checkout sent again (double tap, retry after a lost answer): the first order.
  const existing = await findByCheckoutId(payload, v.checkoutId)
  if (existing) return { ok: true, order: toSaved(existing) }

  const delivery = v.fulfillment === 'delivery'
  const data = {
    customerName: v.name,
    phone: v.phone,
    fulfillment: v.fulfillment,
    area: delivery ? v.area : null,
    street: delivery ? v.street : null,
    building: delivery ? v.building || null : null,
    floor: delivery ? v.floor || null : null,
    landmark: delivery ? v.landmark || null : null,
    notes: v.notes || null,
    checkoutId: v.checkoutId,
    // Product and quantity only: names and prices are taken from the database by the hook.
    items: v.items.map((item) => ({ product: item.productId, quantity: item.quantity })),
  }

  // A new random order number is drawn on each attempt, should two ever collide.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const doc = await payload.create({
        collection: 'orders',
        locale: locale ?? defaultLocale,
        // Orders are admin-only through the API. This server code may create one, but
        // without `user`, so the order hooks still apply every public rule.
        overrideAccess: true,
        data: data as unknown as Order,
      })
      return { ok: true, order: toSaved(doc) }
    } catch (error) {
      if (isUniqueViolation(error, 'checkoutId')) {
        const first = await findByCheckoutId(payload, v.checkoutId)
        if (first) return { ok: true, order: toSaved(first) }
      }
      if (isUniqueViolation(error, 'orderNumber')) continue
      if (error instanceof ValidationError) {
        const paths = error.data.errors.map((e) => e.path)
        if (paths.some((p) => p.startsWith('items'))) return { ok: false, reason: 'cartChanged' }
        const fields = [
          ...new Set(paths.map((p) => FIELD_OF[p] ?? p).filter((p) => FIELDS.has(p))),
        ] as OrderField[]
        if (fields.length) return { ok: false, reason: 'invalid', fields }
      }
      // The failure kind only: the order holds personal data.
      payload.logger.error(
        `Public order failed: ${(error as Error)?.name ?? 'unknown error'} ${(error as { code?: string })?.code ?? ''}`,
      )
      return { ok: false, reason: 'error' }
    }
  }
  return { ok: false, reason: 'error' }
}
