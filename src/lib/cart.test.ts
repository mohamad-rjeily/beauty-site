import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  addToCart,
  cartCount,
  cartSubtotal,
  lineLimit,
  parseCart,
  reconcileCart,
  setQuantity,
  type CartCheck,
  type CartProduct,
} from './cart'
import { MAX_QUANTITY } from './shop'

const product = (id: number, over: Partial<CartProduct> = {}): CartProduct => ({
  id,
  available: true,
  name: `Product ${id}`,
  slug: `product-${id}`,
  priceCents: 1000,
  stock: 5,
  photo: null,
  ...over,
})

test('parseCart: empty, broken or non-array storage gives an empty cart', () => {
  assert.deepEqual(parseCart(null), [])
  assert.deepEqual(parseCart(''), [])
  assert.deepEqual(parseCart('{not json'), [])
  assert.deepEqual(parseCart('{"productId":1,"quantity":1}'), [])
})

test('parseCart: drops malformed lines, merges duplicates, caps the quantity', () => {
  const raw = JSON.stringify([
    { productId: 1, quantity: 2 },
    { productId: 1, quantity: 3 },
    { productId: 2, quantity: 0 },
    { productId: 3, quantity: -1 },
    { productId: 4, quantity: 1.5 },
    { productId: '5', quantity: 1 },
    { productId: 6.2, quantity: 1 },
    { productId: 0, quantity: 1 },
    null,
    { productId: 7, quantity: 99 },
  ])
  assert.deepEqual(parseCart(raw), [
    { productId: 1, quantity: 5 },
    { productId: 7, quantity: MAX_QUANTITY },
  ])
})

test('lineLimit: the stock, never more than the per-product maximum, never negative', () => {
  assert.equal(lineLimit(3), 3)
  assert.equal(lineLimit(0), 0)
  assert.equal(lineLimit(-2), 0)
  assert.equal(lineLimit(500), MAX_QUANTITY)
})

test('addToCart: adds a new line, then adds to it up to the stock', () => {
  const first = addToCart([], 1, 2, 5)
  assert.deepEqual(first, { lines: [{ productId: 1, quantity: 2 }], added: 2 })

  const second = addToCart(first.lines, 1, 10, 5)
  assert.deepEqual(second, { lines: [{ productId: 1, quantity: 5 }], added: 3 })

  const full = addToCart(second.lines, 1, 1, 5)
  assert.equal(full.added, 0)
  assert.equal(full.lines, second.lines, 'nothing added: the same array comes back')
})

test('addToCart: out of stock adds nothing; other lines are kept', () => {
  const lines = [{ productId: 2, quantity: 1 }]
  assert.deepEqual(addToCart(lines, 1, 1, 0), { lines, added: 0 })
  assert.deepEqual(addToCart(lines, 1, 1, 3).lines, [
    { productId: 2, quantity: 1 },
    { productId: 1, quantity: 1 },
  ])
})

test('setQuantity: sets, caps at the maximum, and removes at 0', () => {
  const lines = [
    { productId: 1, quantity: 1 },
    { productId: 2, quantity: 4 },
  ]
  assert.deepEqual(setQuantity(lines, 1, 3), [
    { productId: 1, quantity: 3 },
    { productId: 2, quantity: 4 },
  ])
  assert.deepEqual(setQuantity(lines, 2, 100)[1], { productId: 2, quantity: MAX_QUANTITY })
  assert.deepEqual(setQuantity(lines, 1, 0), [{ productId: 2, quantity: 4 }])
})

test('cartCount: the number of items, not of lines', () => {
  assert.equal(cartCount([]), 0)
  assert.equal(
    cartCount([
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 3 },
    ]),
    5,
  )
})

test('reconcileCart: nothing changed gives rows, the subtotal and no notices', () => {
  const lines = [
    { productId: 1, quantity: 2 },
    { productId: 2, quantity: 1 },
  ]
  const checks: CartCheck[] = [product(1, { priceCents: 1800 }), product(2, { priceCents: 3500 })]
  const result = reconcileCart(lines, checks, { 1: { priceCents: 1800, name: 'Product 1' } })
  assert.deepEqual(result.lines, lines)
  assert.deepEqual(result.notices, [])
  assert.deepEqual(
    result.rows.map((r) => r.lineCents),
    [3600, 3500],
  )
  assert.equal(cartSubtotal(result.rows), 7100)
})

test('reconcileCart: products no longer sold are removed, named only from this browser', () => {
  const lines = [
    { productId: 1, quantity: 1 },
    { productId: 2, quantity: 1 },
    { productId: 3, quantity: 1 },
  ]
  const checks: CartCheck[] = [{ id: 1, available: false }, { id: 2, available: false }]
  const result = reconcileCart(lines, checks, { 1: { priceCents: 1000, name: 'Rose mask' } })
  assert.deepEqual(result.lines, [])
  assert.deepEqual(result.notices, [
    { kind: 'gone', name: 'Rose mask' },
    { kind: 'gone', name: null },
    { kind: 'gone', name: null }, // missing from the answer entirely (deleted)
  ])
})

test('reconcileCart: out of stock removed, too many lowered, price change pointed out', () => {
  const lines = [
    { productId: 1, quantity: 2 },
    { productId: 2, quantity: 4 },
    { productId: 3, quantity: 1 },
  ]
  const checks: CartCheck[] = [
    product(1, { stock: 0 }),
    product(2, { stock: 3, priceCents: 1500 }),
    product(3, { priceCents: 2200 }),
  ]
  const result = reconcileCart(lines, checks, {
    2: { priceCents: 1500, name: 'Product 2' },
    3: { priceCents: 2000, name: 'Product 3' },
  })
  assert.deepEqual(result.lines, [
    { productId: 2, quantity: 3 },
    { productId: 3, quantity: 1 },
  ])
  assert.deepEqual(result.notices, [
    { kind: 'outOfStock', name: 'Product 1' },
    { kind: 'lowered', name: 'Product 2', quantity: 3 },
    { kind: 'priceChanged', name: 'Product 3', priceCents: 2200, oldCents: 2000 },
  ])
  assert.equal(cartSubtotal(result.rows), 3 * 1500 + 2200)
})
