/**
 * The cart's pure logic, safe for browser code and unit-tested (cart.test.ts). The cart itself
 * holds only product ids and quantities; names, prices and stock always come fresh from the
 * server (the cart page asks for them) and the order is priced again on the server.
 */
import { MAX_QUANTITY } from './shop'

export type CartLine = { productId: number; quantity: number }

/** A product as the server reports it for the cart (see the cart page's server action). */
export type CartProduct = {
  id: number
  /** False when the product was switched off, or is not sold on the site. */
  available: boolean
  name: string
  slug: string
  priceCents: number
  stock: number
  photo: { url: string; width: number; height: number; alt: string; position: string } | null
}

export type CartNotice =
  | { kind: 'gone'; name: string | null }
  | { kind: 'outOfStock'; name: string }
  | { kind: 'lowered'; name: string; quantity: number }
  | { kind: 'priceChanged'; name: string; priceCents: number }

const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0

/** Most of one product a cart line can hold: what is in stock, never more than MAX_QUANTITY. */
export const lineLimit = (stock: number): number => Math.max(0, Math.min(stock, MAX_QUANTITY))

/**
 * Reads what was stored. Anything malformed is dropped rather than trusted: storage can be
 * edited by hand or left behind by an older version of the site. Duplicates are merged.
 */
export const parseCart = (raw: string | null): CartLine[] => {
  if (!raw) return []
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(value)) return []
  const merged = new Map<number, number>()
  for (const item of value) {
    const { productId, quantity } = (item ?? {}) as { productId?: unknown; quantity?: unknown }
    if (!isId(productId) || typeof quantity !== 'number' || !Number.isInteger(quantity)) continue
    if (quantity < 1) continue
    merged.set(productId, Math.min(MAX_QUANTITY, (merged.get(productId) ?? 0) + quantity))
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }))
}

/**
 * Adds `quantity` of a product without passing `limit` (what is in stock) in total.
 * Returns the new lines and how many were really added (0 when the cart already holds all).
 */
export const addToCart = (
  lines: CartLine[],
  productId: number,
  quantity: number,
  limit: number,
): { lines: CartLine[]; added: number } => {
  const current = lines.find((l) => l.productId === productId)?.quantity ?? 0
  const next = Math.min(current + Math.max(0, Math.floor(quantity)), lineLimit(limit))
  const added = Math.max(0, next - current)
  if (added === 0) return { lines, added: 0 }
  return {
    lines: current
      ? lines.map((l) => (l.productId === productId ? { ...l, quantity: next } : l))
      : [...lines, { productId, quantity: next }],
    added,
  }
}

/** Sets one line's quantity; 0 or less removes the line. */
export const setQuantity = (lines: CartLine[], productId: number, quantity: number): CartLine[] =>
  quantity < 1
    ? lines.filter((l) => l.productId !== productId)
    : lines.map((l) =>
        l.productId === productId ? { ...l, quantity: Math.min(MAX_QUANTITY, Math.floor(quantity)) } : l,
      )

export const cartCount = (lines: CartLine[]): number =>
  lines.reduce((sum, l) => sum + l.quantity, 0)

export type CartRow = { product: CartProduct; quantity: number; lineCents: number }

/**
 * Brings the cart in line with what the server says now, and explains every change:
 * - a product no longer sold (switched off, deleted) is removed;
 * - an out-of-stock product is removed;
 * - a quantity above the stock is lowered to it;
 * - a price that differs from the one she last saw (`seenPrices`) is pointed out.
 */
export const reconcileCart = (
  lines: CartLine[],
  products: CartProduct[],
  seenPrices: Record<number, number>,
): { lines: CartLine[]; rows: CartRow[]; notices: CartNotice[] } => {
  const byId = new Map(products.map((p) => [p.id, p]))
  const kept: CartLine[] = []
  const rows: CartRow[] = []
  const notices: CartNotice[] = []

  for (const line of lines) {
    const product = byId.get(line.productId)
    if (!product || !product.available) {
      notices.push({ kind: 'gone', name: product?.name ?? null })
      continue
    }
    const limit = lineLimit(product.stock)
    if (limit === 0) {
      notices.push({ kind: 'outOfStock', name: product.name })
      continue
    }
    const quantity = Math.min(line.quantity, limit)
    if (quantity < line.quantity) {
      notices.push({ kind: 'lowered', name: product.name, quantity })
    }
    const seen = seenPrices[product.id]
    if (seen !== undefined && seen !== product.priceCents) {
      notices.push({ kind: 'priceChanged', name: product.name, priceCents: product.priceCents })
    }
    kept.push({ productId: line.productId, quantity })
    rows.push({ product, quantity, lineCents: product.priceCents * quantity })
  }
  return { lines: kept, rows, notices }
}

export const cartSubtotal = (rows: CartRow[]): number =>
  rows.reduce((sum, r) => sum + r.lineCents, 0)
