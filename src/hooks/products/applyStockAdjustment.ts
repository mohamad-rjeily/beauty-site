import { sql } from '@payloadcms/db-postgres'
import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { getTransactionDb } from '@/lib/db'
import { msg } from '@/lib/i18n'
import type { Product } from '@/payload-types'

const fail = (req: PayloadRequest, en: string, ar: string): never => {
  throw new ValidationError({
    collection: 'products',
    errors: [{ path: 'stockAdjustment', message: msg(req, en, ar) }],
    req,
  })
}

/**
 * `stock` is never written from a form. On every product save this hook:
 * - with an adjustment (+10 / -2): runs ONE atomic UPDATE on the save's own transaction
 *   (`stock = stock + adj`, refused if it would go below zero);
 * - without one: locks the row with SELECT ... FOR UPDATE.
 * Either way it puts the database's current value into the save. So a product form left
 * open while an order was confirmed can't write an old number over the new one, and the
 * row stays locked until the save commits.
 * On create, the starting stock is the adjustment (0 or more).
 */
export const applyStockAdjustment: CollectionBeforeChangeHook<Product> = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const raw = (data as { stockAdjustment?: unknown }).stockAdjustment
  const adjustment = raw === null || raw === undefined || raw === '' ? 0 : Number(raw)
  if (!Number.isInteger(adjustment)) {
    fail(req, 'Enter a whole number, e.g. 10 or -2.', 'أدخلي عدداً صحيحاً، مثال: 10 أو -2.')
  }

  if (operation === 'create' || !originalDoc) {
    if (adjustment < 0)
      fail(req, 'Starting stock cannot be negative.', 'لا يمكن أن يكون المخزون الأولي سالباً.')
    data.stock = adjustment
    return data
  }

  const db = await getTransactionDb(req)
  const result =
    adjustment === 0
      ? await db.execute(sql`SELECT stock FROM products WHERE id = ${originalDoc.id} FOR UPDATE`)
      : await db.execute(
          sql`UPDATE products SET stock = stock + ${adjustment}
              WHERE id = ${originalDoc.id} AND stock + ${adjustment} >= 0
              RETURNING stock`,
        )

  if (result.rows.length === 0) {
    fail(req, 'Stock cannot go below zero.', 'لا يمكن أن ينخفض المخزون تحت الصفر.')
  }

  data.stock = Number(result.rows[0].stock)
  return data
}
