/**
 * Full-page review captures of the public site (dev server must be running):
 *   node scripts/screenshots.mjs [baseUrl]
 * Writes .impeccable/review/{mobile,desktop}{,-ar}.png. Motion is settled first (reduced
 * motion + scrolled through once) so no element is caught mid-reveal.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:3000'
const out = '.impeccable/review'
mkdirSync(out, { recursive: true })

const targets = [
  { name: 'mobile', width: 390, height: 844, path: '/en' },
  { name: 'desktop', width: 1440, height: 900, path: '/en' },
  { name: 'mobile-ar', width: 390, height: 844, path: '/ar' },
  { name: 'desktop-ar', width: 1440, height: 900, path: '/ar' },
]

const browser = await chromium.launch()
try {
  for (const target of targets) {
    const context = await browser.newContext({
      viewport: { width: target.width, height: target.height },
      deviceScaleFactor: target.width < 600 ? 2 : 1,
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    await page.goto(base + target.path, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    // Scroll through once so every reveal has fired, then return to the top.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 60))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(600)
    const file = `${out}/${target.name}.png`
    await page.screenshot({ path: file, fullPage: true })
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    console.log(`${file}  ${target.width}×${height}`)
    await context.close()
  }
} finally {
  await browser.close()
}
