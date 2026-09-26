/**
 * Full-page review captures of the public site (dev server must be running):
 *   node scripts/screenshots.mjs [baseUrl] [page ...]
 * Pages are paths without the language, e.g. `/services`; the default is every public page
 * (home, services, gallery, about, contact). Each page is captured at 390 and 1440 wide in
 * English and Arabic, to .impeccable/review/<page>-<mobile|desktop>[-ar].png.
 * Motion is settled first (reduced motion + scrolled through once) so no element is caught
 * mid-reveal.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:3000'
const pages = args.filter((a) => a.startsWith('/'))
const paths = pages.length ? pages : ['', '/services', '/gallery', '/about', '/contact']
const out = '.impeccable/review'
mkdirSync(out, { recursive: true })

const sizes = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]

const browser = await chromium.launch()
try {
  for (const path of paths) {
    for (const lang of ['en', 'ar']) {
      for (const size of sizes) {
        const context = await browser.newContext({
          viewport: { width: size.width, height: size.height },
          deviceScaleFactor: size.width < 600 ? 2 : 1,
          reducedMotion: 'reduce',
        })
        const page = await context.newPage()
        page.on('pageerror', (error) => console.log(`  page error: ${error.message}`))
        // 'load' plus a pause rather than 'networkidle': the dev server keeps a live connection.
        await page.goto(`${base}/${lang}${path}`, { waitUntil: 'load' })
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(1200)
        // Scroll through once so every reveal has fired, then return to the top.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 400) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 60))
          }
          window.scrollTo(0, 0)
        })
        await page.waitForTimeout(600)
        const name = `${path.replace(/^\//, '') || 'home'}-${size.name}${lang === 'ar' ? '-ar' : ''}`
        const file = `${out}/${name}.png`
        await page.screenshot({ path: file, fullPage: true })
        const [height, width] = await page.evaluate(() => [
          document.documentElement.scrollHeight,
          document.documentElement.scrollWidth,
        ])
        const overflow = width > size.width ? `  ⚠ horizontal overflow: ${width}px` : ''
        console.log(`${file}  ${size.width}×${height}${overflow}`)
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
}
