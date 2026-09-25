import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { DEFAULT_CURRENCY } from '@/fields/money'
import { relationId } from '@/lib/db'
import { msg } from '@/lib/i18n'
import type { Order } from '@/payload-types'

const fail = (req: PayloadRequest, path: string, en: string, ar: string): never => {
  throw new ValidationError({
    collection: 'orders',
    errors: [{ path, message: msg(req, en, ar) }],
    req,
  })
}

/**
 * On create only: rebuilds every order line from the products table and recalculates
 * the total on the server. Whatever names or prices the client sent are thrown away.
 * Also refuses inactive products and quantities above the current stock.
 *
 * The lines are then frozen (field access `update: never`), so the order keeps the
 * name and price the customer saw, even if the product changes later.
 */
export const priceOrder: CollectionBeforeChangeHook<Order> = async ({ data, operation, req }) => {
  if (operation !== 'create') return data

  const items = data.items ?? []
  if (items.length === 0)
    fail(
      req,
      'items',
      'An order needs at least one product.',
      'يجب أن يحتوي الطلب على منتج واحد على الأقل.',
    )

  // Snapshot the name in the language the customer ordered in.
  const locale = req.locale === 'ar' ? 'ar' : 'en'
  const requestedPerProduct = new Map<number, number>()
  let total = 0

  const priced = []
  for (const [index, item] of items.entries()) {
    const productId = relationId(item.product)
    const quantity = item.quantity

    if (!productId) {
      return fail(req, `items.${index}.product`, 'Choose a product.', 'اختاري منتجاً.')
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return fail(
        req,
        `items.${index}.quantity`,
        'Quantity must be a whole number, 1 or more.',
        'يجب أن تكون الكمية عدداً صحيحاً، 1 أو أكثر.',
      )
    }

    const product = await req.payload
      .findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        locale,
        req,
        overrideAccess: true,
      })
      .catch(() => null)

    if (!product || !product.active) {
      return fail(
        req,
        `items.${index}.product`,
        'This product is no longer available.',
        'هذا المنتج لم يعد متوفراً.',
      )
    }

    const requested = (requestedPerProduct.get(productId) ?? 0) + quantity
    requestedPerProduct.set(productId, requested)
    if (product.stock < requested) {
      return product.stock === 0
        ? fail(
            req,
            `items.${index}.product`,
            `"${product.name}" is out of stock.`,
            `"${product.name}" غير متوفر حالياً.`,
          )
        : fail(
            req,
            `items.${index}.quantity`,
            `Only ${product.stock} of "${product.name}" left.`,
            `بقي ${product.stock} فقط من "${product.name}".`,
          )
    }

    if (product.price.currency !== DEFAULT_CURRENCY) {
      return fail(
        req,
        `items.${index}.product`,
        'All products in one order must use the same currency.',
        'يجب أن تكون كل منتجات الطلب بالعملة نفسها.',
      )
    }

    const unitAmount = product.price.amount
    const lineAmount = unitAmount * quantity
    total += lineAmount

    priced.push({
      ...item,
      product: productId,
      quantity,
      productName: product.name,
      unitPrice: { amount: unitAmount, currency: DEFAULT_CURRENCY },
      lineTotal: { amount: lineAmount, currency: DEFAULT_CURRENCY },
    })
  }

  data.items = priced
  data.total = { amount: total, currency: DEFAULT_CURRENCY }
  return data
}
