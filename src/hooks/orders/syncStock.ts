import { sql } from '@payloadcms/db-postgres'
import { ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { getTransactionDb, relationId } from '@/lib/db'
import { msg } from '@/lib/i18n'
import type { Order } from '@/payload-types'

/** Statuses in which the order's products have been taken out of stock. */
const HOLDS_STOCK = new Set<Order['status']>(['confirmed', 'delivered'])

type StockLine = { product?: unknown; quantity: number; productName?: string | null }

/**
 * Moves stock when an order enters or leaves a stock-holding status:
 * - new -> confirmed (or delivered): stock goes down
 * - confirmed/delivered -> cancelled (or back to new): stock comes back
 *
 * Everything runs as raw SQL on the operation's own transaction, so the stock change
 * and the status change are saved together or not at all.
 *
 * Race safety:
 * - `SELECT ... FOR UPDATE` locks the order row, so two admins confirming the same
 *   order at once can't both take stock: the second waits, then sees "confirmed".
 * - `UPDATE ... WHERE stock >= qty` is a single atomic statement, so two different
 *   orders can never oversell the last items: one of them updates 0 rows and fails.
 */
export const syncStock: CollectionBeforeChangeHook<Order> = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const db = await getTransactionDb(req)

  let from: Order['status']
  let lines: StockLine[]

  if (operation === 'create') {
    from = 'new'
    lines = data.items ?? []
  } else {
    if (!originalDoc) return data
    const locked = await db.execute(
      sql`SELECT status FROM orders WHERE id = ${originalDoc.id} FOR UPDATE`,
    )
    from = (locked.rows[0]?.status as Order['status'] | undefined) ?? originalDoc.status
    lines = originalDoc.items ?? []
  }

  const to = data.status ?? from
  const heldBefore = HOLDS_STOCK.has(from)
  const heldAfter = HOLDS_STOCK.has(to)
  if (heldBefore === heldAfter) return data

  for (const line of lines) {
    const productId = relationId(line.product)
    const quantity = line.quantity
    const name = line.productName ?? '?'

    if (heldAfter) {
      const taken = productId
        ? await db.execute(
            sql`UPDATE products SET stock = stock - ${quantity} WHERE id = ${productId} AND stock >= ${quantity} RETURNING id`,
          )
        : { rows: [] }

      if (taken.rows.length === 0) {
        throw new ValidationError({
          collection: 'orders',
          errors: [
            {
              path: 'status',
              message: msg(
                req,
                `Not enough stock of "${name}" to confirm this order.`,
                `لا يوجد مخزون كافٍ من "${name}" لتأكيد هذا الطلب.`,
              ),
            },
          ],
          req,
        })
      }
    } else if (productId) {
      await db.execute(sql`UPDATE products SET stock = stock + ${quantity} WHERE id = ${productId}`)
    }
  }

  return data
}
