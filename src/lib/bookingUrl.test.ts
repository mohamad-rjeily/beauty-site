import assert from 'node:assert/strict'
import { test } from 'node:test'

import { bookingSearch, parseBookingQuery } from './bookingUrl'

const parse = (search: string) => {
  const params = new URLSearchParams(search)
  return parseBookingQuery((key) => params.get(key))
}

test('a Book button link (?service=slug) opens step 2', () => {
  assert.equal(parse('?service=soft-glam').step, 'time')
  assert.equal(parse('').step, 'service')
})

test('slot steps survive a round trip through the address', () => {
  const search = '?service=soft-glam&step=details&date=2026-10-20&time=13:30'
  const q = parse(search)
  assert.deepEqual([q.service, q.step, q.date, q.time], ['soft-glam', 'details', '2026-10-20', '13:30'])
  assert.equal(bookingSearch(q), search.replace(':', '%3A'))
})

test('request answers survive a round trip; personal details are never in it', () => {
  const q = parse('?service=bridal&step=details&requestedDate=2026-11-02&locationType=onLocation&people=3&trial=1')
  assert.deepEqual(q.request, {
    requestedDate: '2026-11-02',
    locationType: 'onLocation',
    peopleCount: 3,
    wantsTrial: true,
  })
  assert.deepEqual(parse(bookingSearch(q)), q)
})

test('malformed values are dropped', () => {
  const q = parse('?service=Bad Slug&step=details&date=20-10-2026&time=25:00&people=99&locationType=moon')
  assert.deepEqual(q, { service: null, step: 'service', date: null, time: null, request: {} })
})
