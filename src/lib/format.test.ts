import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatPrice } from './format'

test('formatPrice: "$" before the number, decimals only when needed', () => {
  assert.equal(formatPrice(8000, 'USD'), '$80')
  assert.equal(formatPrice(1250, 'USD'), '$12.50')
  assert.equal(formatPrice(1205, 'USD'), '$12.05')
  assert.equal(formatPrice(0, 'USD'), '$0')
  assert.equal(formatPrice(125000, 'USD'), '$1,250')
})

test('formatPrice: no "US$", no comma decimals, no direction marks, Western digits', () => {
  for (const cents of [8000, 1250, 125000]) {
    const price = formatPrice(cents, 'USD')
    assert.doesNotMatch(price, /US\$/)
    assert.doesNotMatch(price, /\d,\d{2}$/)
    assert.doesNotMatch(price, /[‎‏؜⁦-⁩]/)
    assert.doesNotMatch(price, /[٠-٩۰-۹]/)
  }
})

test('formatPrice: another currency keeps its code', () => {
  assert.equal(formatPrice(8000, 'EUR'), '80 EUR')
})
