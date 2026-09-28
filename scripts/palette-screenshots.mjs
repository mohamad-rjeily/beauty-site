/**
 * PALETTE PREVIEW (branch design-pink): captures for the owner's colour choice.
 * Dev server must be running:
 *   node scripts/palette-screenshots.mjs [baseUrl] --product=/shop/<slug>
 * For each page and palette (current, blush, rose, petal) at 390 wide: the first screen and the
 * full page, to .impeccable/review/palette/<palette>/<page>-first|full[-ar].png, plus one
 * side-by-side comparison per page in .impeccable/review/palette/compare-<page>[-first|-full].png.
 * English for every page, Arabic for home only. Motion is settled as in screenshots.mjs.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
import sharp from 'sharp'

const args = process.argv.slice(2)
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:3000'
const product = args.find((a) => a.startsWith('--product='))?.split('=')[1]
const out = '.impeccable/review/palette'
const palettes = ['current', 'blush', 'rose', 'petal']
const pages = [
  { slug: 'home', path: '', ar: true },
  { slug: 'services', path: '/services' },
  { slug: 'shop', path: '/shop' },
  ...(product ? [{ slug: 'product', path: product }] : []),
  { slug: 'book', path: '/book' },
]

const browser = await chromium.launch()
try {
  for (const palette of palettes) {
    mkdirSync(`${out}/${palette}`, { recursive: true })
    for (const { slug, path, ar } of pages) {
      for (const lang of ar ? ['en', 'ar'] : ['en']) {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 2,
          reducedMotion: 'reduce',
        })
        const page = await context.newPage()
        page.on('pageerror', (error) => console.log(`  page error: ${error.message}`))
        const query = palette === 'current' ? '' : `?palette=${palette}`
        await page.goto(`${base}/${lang}${path}${query}`, { waitUntil: 'load' })
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(1200)
        // The dev server may reload a page once after compiling it: wait until the palette is on.
        const hasPalette = () =>
          page.evaluate(() => document.documentElement.dataset.palette ?? 'current')
        if ((await hasPalette()) !== palette) {
          await page.reload({ waitUntil: 'load' })
          await page.waitForTimeout(1500)
        }
        const set = await hasPalette()
        if (set !== palette) throw new Error(`${palette}: <html> has data-palette=${set} at ${page.url()}`)
        const suffix = lang === 'ar' ? '-ar' : ''
        await page.screenshot({ path: `${out}/${palette}/${slug}-first${suffix}.png` })
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 400) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 60))
          }
          window.scrollTo(0, 0)
        })
        await page.waitForTimeout(600)
        await page.screenshot({ path: `${out}/${palette}/${slug}-full${suffix}.png`, fullPage: true })
        console.log(`${palette}/${slug}${suffix}`)
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
}

// Side by side at phone size (390 px per column), each column labelled with its palette name.
const LABEL = 64
const GAP = 24
const label = (text) =>
  Buffer.from(
    `<svg width="390" height="${LABEL}" xmlns="http://www.w3.org/2000/svg"><text x="195" y="42" font-family="Georgia, serif" font-size="30" text-anchor="middle" fill="#2a2521">${text}</text></svg>`,
  )

for (const { slug, ar } of pages) {
  for (const suffix of ar ? ['', '-ar'] : ['']) {
    for (const kind of ['first', 'full']) {
      const shots = await Promise.all(
        palettes.map((p) =>
          sharp(`${out}/${p}/${slug}-${kind}${suffix}.png`).resize({ width: 390 }).toBuffer(),
        ),
      )
      const heights = await Promise.all(shots.map(async (s) => (await sharp(s).metadata()).height))
      const width = palettes.length * 390 + (palettes.length + 1) * GAP
      const height = LABEL + Math.max(...heights) + GAP
      const file = `${out}/compare-${slug}-${kind}${suffix}.png`
      await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
        .composite(
          palettes.flatMap((p, i) => {
            const left = GAP + i * (390 + GAP)
            return [
              { input: label(p), left, top: 0 },
              { input: shots[i], left, top: LABEL },
            ]
          }),
        )
        .png()
        .toFile(file)
      console.log(file)
    }
  }
}
