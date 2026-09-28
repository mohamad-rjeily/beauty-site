import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  generateOrderNumber,
  isOrderNumber,
  ORDER_NUMBER_ALPHABET,
  ORDER_NUMBER_LENGTH,
} from './orderNumber'

test('order numbers: 6 characters, none that read alike (0/O, 1/I/L)', () => {
  assert.equal(ORDER_NUMBER_LENGTH, 6)
  assert.doesNotMatch(ORDER_NUMBER_ALPHABET, /[01OIL]/)
  for (let i = 0; i < 2000; i++) {
    const code = generateOrderNumber()
    assert.equal(code.length, ORDER_NUMBER_LENGTH)
    assert.ok(isOrderNumber(code), code)
  }
})

test('order numbers: random enough that 10,000 of them almost never repeat', () => {
  const codes = new Set(Array.from({ length: 10_000 }, generateOrderNumber))
  // 31^6 ≈ 887 million codes: a repeat in 10,000 has a chance of about 0.006%.
  assert.ok(codes.size >= 9_999, `${10_000 - codes.size} repeats`)
})

test('order numbers: every character of the alphabet is used, none more than its share', () => {
  const counts = new Map<string, number>()
  for (let i = 0; i < 5_000; i++) {
    for (const ch of generateOrderNumber()) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  }
  assert.equal(counts.size, ORDER_NUMBER_ALPHABET.length)
  const expected = (5_000 * ORDER_NUMBER_LENGTH) / ORDER_NUMBER_ALPHABET.length
  for (const [ch, n] of counts) {
    assert.ok(n > expected * 0.8 && n < expected * 1.2, `${ch}: ${n} (expected ≈ ${expected})`)
  }
})

test('isOrderNumber: refuses lower case, wrong length and look-alike characters', () => {
  assert.ok(isOrderNumber('K7Q2MX'))
  for (const bad of ['k7q2mx', 'K7Q2M', 'K7Q2MXA', 'K7Q2M0', 'K7Q2MO', 'K7Q2MI', 'K7Q2ML', '']) {
    assert.equal(isOrderNumber(bad), false, bad)
  }
})
