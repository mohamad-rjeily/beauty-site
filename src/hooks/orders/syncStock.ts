import { sql } from '@payloadcms/db-postgres'
import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { getTransactionDb, relationId } from '@/lib/db'
import { msg } from '@/lib/i18n'
import type { Order } from '@/payload-types'

/** Statuses in which the order's products have been taken out of stock. */
const HOLDS_STOCK = new Set<Order['status']>(['confirmed', 'delivered'])

type StockLine = { product?: unknown; quantity: number; productName?: string | null }

/**
 * The error shown when confirming needs more than is in stock, in the admin's language:
 * which product, how many this order needs, how many are left, and what she can do.
 */
const shortStock = (req: PayloadRequest, name: string, needed: number, left: number) =>
  new ValidationError({
    collection: 'orders',
    errors: [
      {
        path: 'status',
        // No ":" in these texts: the admin toast turns "a: b, c" into a bulleted list.
        message:
          left > 0
            ? msg(
                req,
                `Can't confirm yet. This order needs ${needed} of "${name}", and only ${left} ${left === 1 ? 'is' : 'are'} left. Add stock on the product, or cancel the order.`,
                `لا يمكن تأكيد الطلب بعد. يحتاج ${needed} من "${name}"، وبقي ${left} فقط. أضيفي إلى مخزون المنتج، أو ألغي الطلب.`,
              )
            : msg(
                req,
                `Can't confirm yet. This order needs ${needed} of "${name}", and none are left. Add stock on the product, or cancel the order.`,
                `لا يمكن تأكيد الطلب بعد. يحتاج ${needed} من "${name}"، ولم يبقَ منه شيء. أضيفي إلى مخزون المنتج، أو ألغي الطلب.`,
              ),
      },
    ],
    req,
  })

/**
 * Delivered orders are final: any status change away from "delivered" is refused.
 *
 * Moves stock when an order enters or leaves a stock-holding status:
 * - new -> confirmed (or delivered): stock goes down
 * - confirmed -> cancelled (or back to new): stock comes back
 *
 * Everything runs as raw SQL on the operation's own transaction, so the stock change
 * and the status change are saved together or not at all.
 *
 * Race safety:
 * - `SELECT ... FOR UPDATE` locks the order row, so two admins confirming the same
 *   order at once can't both take stock: the second waits, then sees "confirmed".
 * - `UPDATE ... WHERE stock >= qty` is a single atomic statement, so two different
 *   orders can never oversell the last items: one of them updates 0 rows and fails.
 *   A failure throws, which rolls back the stock already taken for the other products.
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

  // Delivered is final. Checked against the locked row, so two saves at once can't slip past.
  if (from === 'delivered' && to !== 'delivered') {
    throw new ValidationError({
      collection: 'orders',
      errors: [
        {
          path: 'status',
          message: msg(
            req,
            'A delivered order is final. For a return, adjust the product stock by hand.',
            'الطلب الذي تم تسليمه نهائي. في حال الإرجاع، عدّلي مخزون المنتج يدوياً.',
          ),
        },
      ],
      req,
    })
  }
  const heldBefore = HOLDS_STOCK.has(from)
  const heldAfter = HOLDS_STOCK.has(to)
  if (heldBefore === heldAfter) return data

  // One stock move per product: an order may list the same product on two lines.
  const perProduct = new Map<number, { quantity: number; snapshotName: string }>()
  for (const line of lines) {
    const productId = relationId(line.product)
    if (!productId) {
      if (heldAfter) throw shortStock(req, line.productName ?? '?', line.quantity, 0)
      continue // the product was deleted: nothing to put back
    }
    const entry = perProduct.get(productId)
    perProduct.set(productId, {
      quantity: (entry?.quantity ?? 0) + line.quantity,
      snapshotName: entry?.snapshotName ?? line.productName ?? '?',
    })
  }

  for (const [productId, { quantity, snapshotName }] of perProduct) {
    if (!heldAfter) {
      await db.execute(sql`UPDATE products SET stock = stock + ${quantity} WHERE id = ${productId}`)
      continue
    }
    const taken = await db.execute(
      sql`UPDATE products SET stock = stock - ${quantity} WHERE id = ${productId} AND stock >= ${quantity} RETURNING id`,
    )
    if (taken.rows.length > 0) continue

    // Not enough: name the product in the admin's language, with what is left right now.
    const product = await req.payload
      .findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        locale: req.i18n?.language === 'ar' ? 'ar' : 'en',
        select: { name: true, stock: true },
        overrideAccess: true,
        req,
      })
      .catch(() => null)
    throw shortStock(req, product?.name ?? snapshotName, quantity, product?.stock ?? 0)
  }

  return data
}
