'use server'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { placeOrder, type OrderResult } from '@/lib/order'

/**
 * Sends the checkout. A public POST endpoint (anyone can call it without the page), so the
 * whole check happens in placeOrder: validation, honeypot, rate limit, server prices. Nothing
 * here passes a `user` to Payload: the order hooks apply every public rule.
 */
export async function submitOrder(input: unknown): Promise<OrderResult> {
  const payload = await getPayload({ config })
  return placeOrder(payload, input, await headers())
}
