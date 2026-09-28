import assert from 'node:assert/strict'
import { test } from 'node:test'

import { adminLang, formatOrderDate, statusLabel } from './orderAdmin'

test('formatOrderDate: short date on the Beirut clock, the year only when it is not this year', () => {
  const year = new Date().getFullYear()
  // 09:40 UTC in September is 12:40 in Beirut (summer time, UTC+3).
  assert.equal(formatOrderDate(`${year}-09-28T09:40:00Z`, 'en'), 'Sep 28, 12:40')
  // January is winter time (UTC+2).
  assert.equal(formatOrderDate('2020-01-15T10:00:00Z', 'en'), 'Jan 15, 2020, 12:00')
  const arabic = formatOrderDate(`${year}-09-28T09:40:00Z`, 'ar')
  assert.match(arabic, /28/)
  assert.match(arabic, /12:40/)
  assert.doesNotMatch(arabic, /[٠-٩]/, 'Western digits, as on price tags in Lebanon')
})

test('statusLabel and adminLang: English and Arabic, English for anything else', () => {
  assert.equal(statusLabel('new', 'en'), 'New')
  assert.equal(statusLabel('delivered', 'ar'), 'تم التسليم')
  assert.equal(adminLang('ar'), 'ar')
  assert.equal(adminLang('fr'), 'en')
  assert.equal(adminLang(undefined), 'en')
})
