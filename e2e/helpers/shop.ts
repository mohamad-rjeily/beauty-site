import { expect, type Page } from '@playwright/test'

import { formatPrice } from '../../src/lib/format'
import type { Locale } from './fixtures'
import { dict } from './fixtures'

/** "$36" / "$35.50": how the site writes prices (src/lib/format.ts). */
export const usd = (cents: number) => formatPrice(cents, 'USD')

/** The cart's storage key (src/lib/cartStore.ts). */
const CART_KEY = 'cart:v1'

/** Puts lines straight into this browser's cart (faster than the product pages). */
export const seedCart = async (
  page: Page,
  locale: Locale,
  lines: { productId: number; quantity: number }[],
) => {
  await page.goto(`/${locale}/shop`)
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [
    CART_KEY,
    JSON.stringify(lines),
  ] as const)
}

export const cartLines = (page: Page) =>
  page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), CART_KEY) as Promise<
    { productId: number; quantity: number }[]
  >

export type Details = {
  name: string
  phone: string
  fulfillment: 'delivery' | 'pickup'
  area?: string
  street?: string
  building?: string
  floor?: string
  landmark?: string
  notes?: string
}

/** The checkout form on the cart page. */
export class CheckoutForm {
  constructor(
    readonly page: Page,
    readonly locale: Locale,
  ) {}

  get t() {
    return dict[this.locale].checkout
  }

  get form() {
    return this.page.locator('form[aria-labelledby="checkout-title"]')
  }

  async open() {
    await this.page.goto(`/${this.locale}/cart`)
    await expect(this.form).toBeVisible()
  }

  async fill(d: Details) {
    await this.page.locator('#order-name').fill(d.name)
    await this.page.locator('#order-phone').fill(d.phone)
    await this.form
      .locator('label', { hasText: d.fulfillment === 'delivery' ? this.t.delivery : this.t.pickup })
      .click()
    if (d.fulfillment === 'delivery') {
      await this.page.locator('#order-area').fill(d.area ?? '')
      await this.page.locator('#order-street').fill(d.street ?? '')
      if (d.building) await this.page.locator('#order-building').fill(d.building)
      if (d.floor) await this.page.locator('#order-floor').fill(d.floor)
      if (d.landmark) await this.page.locator('#order-landmark').fill(d.landmark)
    }
    if (d.notes) await this.page.locator('#order-notes').fill(d.notes)
  }

  get submitButton() {
    return this.form.locator('button[type="submit"]')
  }

  /** The row of the totals list whose label is `label`. */
  totalsRow(label: string) {
    return this.form
      .locator('dl > div')
      .filter({ has: this.page.locator('dt', { hasText: label }) })
  }

  get doneHeading() {
    return this.page.getByRole('heading', { name: this.t.done.replace(/\*/g, '') })
  }

  get whatsappButton() {
    return this.page.locator('a[href^="https://wa.me/"]', { hasText: this.t.sendOnWhatsApp })
  }

  /** The pre-filled WhatsApp text of the success screen's button. */
  async whatsappMessage() {
    const href = (await this.whatsappButton.getAttribute('href'))!
    return new URL(href).searchParams.get('text') ?? ''
  }

  /** The order number shown on the success screen. */
  async orderNumber() {
    return (
      await this.page
        .locator('p', { hasText: this.t.orderNumber.split('{')[0].trim() })
        .locator('bdi')
        .first()
        .innerText()
    ).trim()
  }
}

/** True when the page doesn't scroll sideways on the phone. */
export const noSideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
