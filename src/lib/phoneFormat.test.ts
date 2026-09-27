import assert from 'node:assert/strict'
import { test } from 'node:test'

import { isValidPhone, normalizePhone, toE164 } from './phoneFormat'

const ACCEPTED: [input: string, stored: string][] = [
  ['03 123 456', '+9613123456'],
  ['03123456', '+9613123456'],
  ['3123456', '+9613123456'],
  ['71123456', '+96171123456'],
  ['071 123 456', '+96171123456'],
  ['81 123 456', '+96181123456'],
  ['01 234 567', '+9611234567'],
  ['09 123 456', '+9619123456'],
  ['03-123-456', '+9613123456'],
  ['(03) 123.456', '+9613123456'],
  ['٠٣ ١٢٣ ٤٥٦', '+9613123456'],
  ['۰۳ ۱۲۳ ۴۵۶', '+9613123456'],
  ['+961 3 123 456', '+9613123456'],
  ['+961 71 123 456', '+96171123456'],
  ['00961 71 123 456', '+96171123456'],
  ['+44 20 7946 0958', '+442079460958'],
  ['0044 20 7946 0958', '+442079460958'],
  ['+1 (212) 555-0100', '+12125550100'],
]

const REFUSED = [
  '',
  'abc',
  '123',
  '03 123 45', // 6 digits
  '12345678', // 8 digits must start with 7 or 8
  '+961 12345678', // same rule after +961
  '+961 3 123 45', // too short after +961
  '+961 3 123 456 789 012', // too long
  '0 0123456', // "00" -> "+0...", no country code starts with 0
  '+44 12', // too short for any country
  '+1234567890123456', // 16 digits
]

test('phones accepted, stored in E.164', () => {
  for (const [input, stored] of ACCEPTED) {
    assert.equal(toE164(input), stored, input)
    assert.equal(normalizePhone(input), stored, input)
    assert.equal(isValidPhone(input), true, input)
  }
})

test('phones refused', () => {
  for (const input of REFUSED) {
    assert.equal(toE164(input), null, input)
    assert.equal(isValidPhone(input), false, input)
  }
})

test('numbers already stored in E.164 stay the same', () => {
  for (const stored of ['+9613123456', '+96171123456', '+442079460958']) {
    assert.equal(normalizePhone(stored), stored)
  }
})
