import { request, type APIRequestContext } from '@playwright/test'

import type { Busy, Rules } from './beirut'

/**
 * Talks to Payload's REST API, the same way the admin panel does:
 * - public reads (services, availability, settings) without a user;
 * - bookings as the temporary e2e admin (req.user is set, so the admin rules apply:
 *   exempt from hours and notice, never from no-overlap).
 */

export type Service = {
  id: number
  slug: string
  name: string
  category: 'makeup' | 'skincare'
  bookingMode: 'slot' | 'request'
  duration: number
  active: boolean
}

export type Booking = {
  id: number
  customerName: string
  phone: string
  service: number
  mode: 'slot' | 'request'
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  startTime?: string | null
  endTime?: string | null
  occupiedUntil?: string | null
  requestedDate?: string | null
  locationType?: string | null
  locationAddress?: string | null
  peopleCount?: number | null
  wantsTrial?: boolean | null
  notes?: string | null
}

type ApiResult<T> = { status: number; body: T & { errors?: { message: string; data?: unknown }[] } }

const qs = (params: Record<string, string | number>) =>
  new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()

export type Product = {
  id: number
  name: string
  slug: string
  type: 'brand' | 'homemade' | 'fashion'
  active: boolean
  stock: number
  price: { amount: number; currency: 'USD' }
}

export type Order = {
  id: number
  orderNumber: string
  customerName: string
  phone: string
  fulfillment: 'delivery' | 'pickup'
  area?: string | null
  street?: string | null
  building?: string | null
  floor?: string | null
  landmark?: string | null
  notes?: string | null
  locale?: 'en' | 'ar' | null
  status: 'new' | 'confirmed' | 'delivered' | 'cancelled'
  items: {
    product: number
    quantity: number
    productName: string
    unitPrice: { amount: number }
    lineTotal: { amount: number }
  }[]
  deliveryFee?: { amount?: number | null }
  total: { amount: number }
}

export class Api {
  private constructor(
    private readonly ctx: APIRequestContext,
    /** Never logged in: the login response's cookie stays in `ctx`, so public calls use this. */
    private readonly publicCtx: APIRequestContext,
    private readonly token: string,
  ) {}

  static async login(baseURL: string): Promise<Api> {
    const email = process.env.E2E_ADMIN_EMAIL
    const password = process.env.E2E_ADMIN_PASSWORD
    if (!email || !password)
      throw new Error('Temporary e2e admin missing: run through `npm run test:e2e`.')
    const ctx = await request.newContext({ baseURL })
    const res = await ctx.post('/api/users/login', { data: { email, password } })
    if (!res.ok()) throw new Error(`Admin login failed (${res.status()}).`)
    const { token } = (await res.json()) as { token: string }
    return new Api(ctx, await request.newContext({ baseURL }), token)
  }

  async dispose() {
    await this.ctx.dispose()
    await this.publicCtx.dispose()
  }

  private get auth() {
    return { Authorization: `JWT ${this.token}` }
  }

  private async send<T>(
    method: 'get' | 'post' | 'patch',
    url: string,
    data?: unknown,
    asAdmin = true,
    headers: Record<string, string> = {},
  ): Promise<ApiResult<T>> {
    const res = await (asAdmin ? this.ctx : this.publicCtx)[method](url, {
      headers: { ...(asAdmin ? this.auth : {}), ...headers },
      ...(data !== undefined ? { data } : {}),
    })
    return { status: res.status(), body: (await res.json()) as ApiResult<T>['body'] }
  }

  // ── Public reads ──────────────────────────────────────────────────────────
  async services(locale: 'en' | 'ar' = 'en'): Promise<Service[]> {
    const { body } = await this.send<{ docs: Service[] }>(
      'get',
      `/api/services?${qs({ locale, depth: 0, limit: 200, sort: 'sortOrder', 'where[active][equals]': 'true' })}`,
      undefined,
      false,
    )
    return body.docs
  }

  async rules(): Promise<Rules> {
    const { body } = await this.send<Rules>(
      'get',
      '/api/globals/availability?depth=0',
      undefined,
      false,
    )
    return body
  }

  async settings(locale: 'en' | 'ar' = 'en') {
    const { body } = await this.send<{
      whatsappNumber?: string | null
      brandName?: string | null
      shop?: { deliveryFee?: { amount?: number | null } }
    }>('get', `/api/globals/site-settings?${qs({ locale, depth: 0 })}`, undefined, false)
    return body
  }

  /** The owner's display name shown on the booking page (home signature). */
  async ownerName(locale: 'en' | 'ar'): Promise<string> {
    const { body } = await this.send<{ signature?: string | null }>(
      'get',
      `/api/globals/home?${qs({ locale, depth: 0 })}`,
      undefined,
      false,
    )
    return body.signature ?? ''
  }

  // ── Bookings, as the admin ────────────────────────────────────────────────
  async bookingsNamed(name: string): Promise<Booking[]> {
    const { body } = await this.send<{ docs: Booking[] }>(
      'get',
      `/api/bookings?${qs({ depth: 0, limit: 200, 'where[customerName][equals]': name })}`,
    )
    return body.docs
  }

  async bookingsNamedLike(prefix: string): Promise<Booking[]> {
    const { body } = await this.send<{ docs: Booking[] }>(
      'get',
      `/api/bookings?${qs({ depth: 0, limit: 500, 'where[customerName][contains]': prefix })}`,
    )
    return body.docs.filter((b) => b.customerName.startsWith(prefix))
  }

  /** [start, occupiedUntil) of every non-cancelled booking that has times. */
  async busy(): Promise<Busy[]> {
    const { body } = await this.send<{ docs: Booking[] }>(
      'get',
      `/api/bookings?${qs({
        depth: 0,
        limit: 1000,
        'where[status][not_equals]': 'cancelled',
        'where[startTime][exists]': 'true',
      })}`,
    )
    return body.docs
      .filter((b) => b.startTime && b.occupiedUntil)
      .map((b) => ({
        start: new Date(b.startTime as string).getTime(),
        until: new Date(b.occupiedUntil as string).getTime(),
      }))
  }

  createBooking(data: Record<string, unknown>) {
    return this.send<{ doc: Booking }>('post', '/api/bookings?depth=0', data)
  }

  updateBooking(id: number, data: Record<string, unknown>) {
    return this.send<{ doc: Booking }>('patch', `/api/bookings/${id}?depth=0`, data)
  }

  // ── Shop ──────────────────────────────────────────────────────────────────
  /** Products as the public API returns them (fashion items and switched-off ones never). */
  async publicProducts(locale: 'en' | 'ar' = 'en'): Promise<Product[]> {
    const { body } = await this.send<{ docs: Product[] }>(
      'get',
      `/api/products?${qs({ locale, depth: 0, limit: 200 })}`,
      undefined,
      false,
    )
    return body.docs
  }

  /** Every product, as the admin sees them. */
  async products(locale: 'en' | 'ar' = 'en'): Promise<Product[]> {
    const { body } = await this.send<{ docs: Product[] }>(
      'get',
      `/api/products?${qs({ locale, depth: 0, limit: 200 })}`,
    )
    return body.docs
  }

  async product(id: number, locale: 'en' | 'ar' = 'en'): Promise<Product> {
    const { body } = await this.send<Product>(
      'get',
      `/api/products/${id}?${qs({ locale, depth: 0 })}`,
    )
    return body
  }

  createProduct(data: Record<string, unknown>) {
    return this.send<{ doc: Product }>('post', '/api/products?depth=0', data)
  }

  async deleteProduct(id: number) {
    await this.ctx.delete(`/api/products/${id}`, { headers: this.auth })
  }

  updateProduct(id: number, data: Record<string, unknown>) {
    return this.send<{ doc: Product }>('patch', `/api/products/${id}?depth=0`, data)
  }

  /** Test products on sale with at least `min` in stock, most stock first. */
  async productsOnSale(min: number, locale: 'en' | 'ar' = 'en'): Promise<Product[]> {
    return (await this.publicProducts(locale))
      .filter((p) => p.active && p.type !== 'fashion' && p.stock >= min)
      .sort((a, b) => b.stock - a.stock)
  }

  async ordersNamed(name: string): Promise<Order[]> {
    const { body } = await this.send<{ docs: Order[] }>(
      'get',
      `/api/orders?${qs({ depth: 0, limit: 50, 'where[customerName][equals]': name })}`,
    )
    return body.docs
  }

  /** Orders are private: this is what a visitor with no login gets. */
  anonymousOrders() {
    return this.send<{ docs?: Order[] }>('get', '/api/orders?depth=0', undefined, false)
  }

  createOrder(data: Record<string, unknown>) {
    return this.send<{ doc: Order }>('post', '/api/orders?depth=0', data)
  }

  /** As the admin would in the panel; `lang` is the admin language (error messages). */
  setOrderStatus(id: number, status: Order['status'], lang: 'en' | 'ar' = 'en') {
    return this.send<{ doc: Order }>('patch', `/api/orders/${id}?depth=0`, { status }, true, {
      Cookie: `payload-lng=${lang}`,
    })
  }

  /** Log a browser context in as the temporary admin (for the admin panel pages). */
  static async loginContext(context: { request: APIRequestContext }) {
    const res = await context.request.post('/api/users/login', {
      data: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD },
    })
    if (!res.ok()) throw new Error(`Admin login failed (${res.status()}).`)
  }
}

/** The first error message of a refused REST call. */
export const firstError = (result: ApiResult<unknown>): string => {
  const error = result.body.errors?.[0] as
    { message?: string; data?: { errors?: { message?: string }[] } } | undefined
  return error?.data?.errors?.[0]?.message ?? error?.message ?? ''
}
