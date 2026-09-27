import assert from 'node:assert/strict'
import { test } from 'node:test'

import { getClientIp } from './clientIp'

const headers = (values: Record<string, string>) => new Headers(values)
const spoofed = { 'x-forwarded-for': '203.0.113.9, 10.0.0.1', 'x-real-ip': '203.0.113.8' }

test('production: only the TRUSTED_IP_HEADER header counts', () => {
  const env = { NODE_ENV: 'production', TRUSTED_IP_HEADER: 'x-host-client-ip' }
  const ip = getClientIp(headers({ ...spoofed, 'x-host-client-ip': '198.51.100.7' }), env, () => {})
  assert.equal(ip, '198.51.100.7')
})

test('production: x-forwarded-for is ignored when the trusted header is missing', () => {
  const warnings: string[] = []
  const env = { NODE_ENV: 'production', TRUSTED_IP_HEADER: 'x-host-client-ip' }
  assert.equal(getClientIp(headers(spoofed), env, (m) => warnings.push(m)), null)
  assert.equal(getClientIp(headers(spoofed), env, (m) => warnings.push(m)), null)
  assert.equal(warnings.length, 1, 'the warning is logged once, not per request')
})

test('production without TRUSTED_IP_HEADER: no per-visitor IP', () => {
  assert.equal(getClientIp(headers(spoofed), { NODE_ENV: 'production' }, () => {}), null)
})

test('development: the first x-forwarded-for address (the e2e suite depends on it)', () => {
  assert.equal(getClientIp(headers(spoofed), { NODE_ENV: 'development' }), '203.0.113.9')
  assert.equal(getClientIp(headers({ 'x-real-ip': '203.0.113.8' }), { NODE_ENV: 'test' }), '203.0.113.8')
})
