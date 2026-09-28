/**
 * Phone captures of the orders admin (dev server must be running, demo content seeded):
 *   npx tsx scripts/admin-screenshots.ts [baseUrl]
 *
 * Logs in as a temporary admin (random email and password, created and deleted exactly like
 * the e2e runs, never printed), then captures at 390 wide, in the English and Arabic admin:
 * - the orders list
 * - the DEMO Layla order (delivery, full address)
 * - the error when confirming the DEMO دانة order (not enough turmeric masks)
 * Files: .impeccable/review/admin-<name>[-ar].png. Confirming fails, so nothing is changed.
 */
import 'dotenv/config'

import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { chromium, type Page } from 'playwright'

import { runDbScript } from '../e2e/global-setup'
import { assertTestDatabase } from '../e2e/guard'
import { ADMIN_EMAIL_DOMAIN, ADMIN_EMAIL_PREFIX } from '../e2e/visitors'

assertTestDatabase()

const base = process.argv.slice(2).find((a) => a.startsWith('http')) ?? 'http://localhost:3000'
const out = '.impeccable/review'
mkdirSync(out, { recursive: true })

const email = `${ADMIN_EMAIL_PREFIX}${randomBytes(6).toString('hex')}${ADMIN_EMAIL_DOMAIN}`
const password = randomBytes(24).toString('base64url')
runDbScript('clean')
runDbScript('setup', { E2E_ADMIN_EMAIL: email, E2E_ADMIN_PASSWORD: password })

const settle = async (page: Page) => {
  // The dev server's floating badge is not part of the admin: keep it out of the pictures.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1500)
}

const browser = await chromium.launch()
try {
  for (const lang of ['en', 'ar'] as const) {
    const suffix = lang === 'ar' ? '-ar' : ''
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    })
    await context.addCookies([{ name: 'payload-lng', value: lang, url: base }])
    const login = await context.request.post(`${base}/api/users/login`, {
      data: { email, password },
    })
    if (!login.ok()) throw new Error(`Admin login failed (${login.status()}).`)

    const findOrder = async (name: string) => {
      const res = await context.request.get(`${base}/api/orders`, {
        params: { 'where[customerName][equals]': name, depth: '0', limit: '1' },
      })
      const id = (await res.json()).docs?.[0]?.id as number | undefined
      if (!id) throw new Error(`Order "${name}" not found: run npm run demo:seed first.`)
      return id
    }

    const page = await context.newPage()
    page.on('pageerror', (error) => console.log(`  page error: ${error.message}`))

    const shot = async (name: string, fullPage = true) => {
      if (fullPage) {
        // Payload renders form fields as they scroll into view: scroll through once first.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 400) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 120))
          }
          window.scrollTo(0, 0)
        })
        await page.waitForTimeout(600)
      }
      const file = `${out}/admin-${name}${suffix}.png`
      await page.screenshot({ path: file, fullPage })
      const width = await page.evaluate(() => document.documentElement.scrollWidth)
      console.log(`${file}${width > 390 ? `  ⚠ horizontal overflow: ${width}px` : ''}`)
      if (width > 390) {
        // Name the outermost elements that stick out past either edge of the screen.
        const culprits = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('body *')]
            .filter((el) => {
              // Inline checks only: a named helper here would not exist in the browser.
              const r = el.getBoundingClientRect()
              const p = el.parentElement?.getBoundingClientRect()
              const outside = r.width > 0 && (r.left < -1 || r.right > 391)
              const parentOutside = !!p && p.width > 0 && (p.left < -1 || p.right > 391)
              return outside && !parentOutside
            })
            .slice(0, 5)
            .map((el) => {
              const r = el.getBoundingClientRect()
              return `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} [${Math.round(r.left)}, ${Math.round(r.right)}]`
            }),
        )
        for (const c of culprits) console.log(`    ${c}`)
      }
    }

    await page.goto(`${base}/admin/collections/orders`, { waitUntil: 'load' })
    await page.locator('.table').waitFor()
    await settle(page)
    await shot('orders-list')

    await page.goto(`${base}/admin/collections/orders/${await findOrder('DEMO Layla')}`)
    await page.locator('form').first().waitFor()
    await settle(page)
    await shot('order-detail')

    await page.goto(`${base}/admin/collections/orders/${await findOrder('DEMO دانة')}`)
    await page.locator('#field-status').waitFor()
    await settle(page)
    await page.locator('#field-status').scrollIntoViewIfNeeded()
    await page.locator('#field-status .rs__control').click()
    await page
      .locator('.rs__option', { hasText: lang === 'ar' ? 'مؤكد' : 'Confirmed' })
      .first()
      .click()
    await page.locator('#action-save').click()
    await page.locator('[data-sonner-toast][data-type="error"]').first().waitFor()
    await page.waitForTimeout(800)
    await shot('stock-error', false)

    await context.close()
  }
} finally {
  await browser.close()
  runDbScript('clean')
}
