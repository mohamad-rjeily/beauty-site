/**
 * PALETTE PREVIEW (branch design-pink): the owner's comparison pack, with no demo photos.
 *
 *   node scripts/palette-mockups.mjs [baseUrl] --product=/shop/<slug>
 *
 * 1. The approved mockups in design/ (home, services, gallery, about, contact), rendered in
 *    current, blush, rose and petal. The originals are never edited: each variant is written
 *    to .impeccable/review/palette-mockups/<palette>/html/ with its colours swapped for the
 *    values in the PALETTE PREVIEW block of globals.css (parsed from that file, so the two
 *    can't drift), and the live grain overlay replaced by the lighter grain-light.webp tile.
 * 2. Site pages with no mockup (shop, a product, booking step 1), captured from the dev server
 *    with ?palette=… and ?photos=off, so every photo is a placeholder like the mockups.
 * 3. At 390 wide, full page: one PNG per page and palette, one labelled side-by-side
 *    comparison per page, and one PDF per palette with all its pages in order.
 * The mockups carry their own tiny runtime (support.js, not in the repo): the minimal
 * renderer below covers what they use ({{path}}, <sc-for>, <sc-if>, a DCLogic component).
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import sharp from 'sharp'

const args = process.argv.slice(2)
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:3000'
const product = args.find((a) => a.startsWith('--product='))?.split('=')[1]
if (!product) throw new Error('Pass --product=/shop/<slug>')
const out = '.impeccable/review/palette-mockups'
const palettes = ['current', 'blush', 'rose', 'petal']

const pages = [
  { slug: 'home', mockup: 'design/home-c1-sunlit-arch.html' },
  { slug: 'services', mockup: 'design/services-c1-sunlit-arch.html' },
  { slug: 'gallery', mockup: 'design/gallery-c1-sunlit-arch.html' },
  { slug: 'about', mockup: 'design/about-c1-sunlit-arch.html' },
  { slug: 'contact', mockup: 'design/contact-c1-sunlit-arch.html' },
  { slug: 'shop', path: '/en/shop' },
  { slug: 'product', path: `/en${product}` },
  { slug: 'book', path: '/en/book' },
]

// ── Palettes, read from globals.css ─────────────────────────────────────────
const css = readFileSync('src/app/(frontend)/globals.css', 'utf8')
const vars = (block) =>
  Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
  )
const theme = vars(css.match(/@theme \{([\s\S]*?)\n\}/)[1])
const variant = (name) =>
  vars(css.match(new RegExp(`\\[data-palette='${name}'\\] \\{([\\s\\S]*?)\\n\\}`))[1])

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const rgbToHex = (c) =>
  '#' +
  c
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
const mix = (a, b, t) => hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t)
/** First rgb(r g b / a) in a shadow value: its colour and alpha. */
const shadowTint = (s) => {
  const m = s.match(/rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/)
  return { rgb: [m[1], m[2], m[3]].map(Number), alpha: Number(m[4]) }
}

// Mockup colours that are tokens, by the token they come from.
const tokenOf = {
  '#F7F2EA': 'paper',
  '#2A2521': 'ink',
  '#574C41': 'ink-soft',
  '#EDE6DA': 'limestone',
  '#5E6B55': 'sage',
  '#E2D8C9': 'sand',
  '#9C4F32': 'clay',
  '#D9A58A': 'clay-tint',
  '#733820': 'clay-deep',
  '#C9B9A4': 'earth-soft',
  '#A39480': 'stone',
  '#3A2A22': 'earth',
  '#F2DDD0': 'clay-mist',
  '#D6CBBB': 'line',
  '#FFFCF7': 'paper-bright',
  '#F3ECE1': 'deck-mid',
  '#EFE7DB': 'deck-back',
}
// Mockup colours that aren't tokens (placeholder stripes): a mix of two tokens. The ratio is
// fitted on the current palette, then the same mix is taken of the variant's tokens.
const mixOf = {
  '#DBD0BF': ['sand', 'line'],
  '#CFC0AB': ['line', 'stone'],
  '#C6B6A0': ['line', 'stone'],
  '#7D6A58': ['earth', 'stone'],
  '#735F4E': ['earth', 'stone'],
  '#A08A74': ['stone', 'earth'],
}
const fit = (hex, a, b) => {
  const [x, p, q] = [hex, theme[`color-${a}`], theme[`color-${b}`]].map(hexToRgb)
  let num = 0,
    den = 0
  for (let i = 0; i < 3; i++) {
    num += (x[i] - p[i]) * (q[i] - p[i])
    den += (q[i] - p[i]) ** 2
  }
  return num / den
}

function recolour(html, name) {
  if (name === 'current') return html
  const v = variant(name)
  const colour = (token) => v[`color-${token}`] ?? theme[`color-${token}`]
  const map = {}
  for (const [hex, token] of Object.entries(tokenOf)) map[hex] = colour(token).toUpperCase()
  for (const [hex, [a, b]] of Object.entries(mixOf))
    map[hex] = rgbToHex(mix(colour(a), colour(b), fit(hex, a, b)))
  // Shadows: the ink and on-clay tints of the variant, at the variant's strength (the block
  // softens its ink shadows; alphas of 0.3 and up are labels and type shadows, kept as they are).
  const ink = shadowTint(v['shadow-soft'])
  const inkScale = ink.alpha / shadowTint(theme['shadow-soft']).alpha
  const clay = shadowTint(v['shadow-on-clay']).rgb
  return html
    .replace(/#[0-9a-f]{6}\b/gi, (h) => map[h.toUpperCase()] ?? h)
    .replace(/rgba\(42, 37, 33, ([\d.]+)\)/g, (_, a) => {
      const alpha = Number(a) < 0.3 ? +(Number(a) * inkScale).toFixed(3) : Number(a)
      return `rgba(${ink.rgb.join(', ')}, ${alpha})`
    })
    .replace(/rgba\(60, 22, 8, ([\d.]+)\)/g, (_, a) => `rgba(${clay.join(', ')}, ${a})`)
    .replace(
      /<svg aria-hidden="true" width="390" height="(\d+)"[^>]*mix-blend-mode: multiply">[\s\S]*?<\/svg>/,
      (_, h) =>
        `<div aria-hidden="true" style="position: absolute; left: 0; top: 0; z-index: 60; width: 390px; height: ${h}px; pointer-events: none; background: url('../../grain-light.webp') 0 0 / 128px 128px"></div>`,
    )
}

// ── Minimal renderer for the mockups' template syntax ───────────────────────
class DCLogic {
  constructor(props) {
    this.props = props
    this.state = {}
  }
  setState() {}
}

const resolve = (expr, scope) => {
  if (expr === 'false') return false
  if (expr === 'true') return true
  return expr.split('.').reduce((v, k) => (v == null ? undefined : v[k]), scope)
}

/** Expands the first <sc-for>/<sc-if> (with its matching close tag), recursively. */
function expand(tpl, scope) {
  const open = tpl.match(/<(sc-for|sc-if)\b([^>]*)>/)
  if (!open) {
    return tpl
      .replace(/\s+on[A-Z][a-zA-Z]*="\{\{[^}]*\}\}"/g, '') // event handlers: static render
      .replace(/\{\{([^}]+)\}\}/g, (_, e) => {
        const v = resolve(e.trim(), scope)
        return v == null || typeof v === 'function' ? '' : String(v)
      })
  }
  const tag = open[1]
  const start = open.index
  const bodyStart = start + open[0].length
  let depth = 1
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g')
  re.lastIndex = bodyStart
  let m
  while ((m = re.exec(tpl))) {
    depth += m[1] ? -1 : 1
    if (depth === 0) break
  }
  const body = tpl.slice(bodyStart, m.index)
  const attr = (n) => open[2].match(new RegExp(`${n}="\\{\\{([^}]+)\\}\\}"`))?.[1]
  const attrRaw = (n) => open[2].match(new RegExp(`${n}="([^"]+)"`))?.[1]
  let rendered = ''
  if (tag === 'sc-for') {
    const list = resolve(attr('list'), scope) ?? []
    rendered = list.map((item) => expand(body, { ...scope, [attrRaw('as')]: item })).join('')
  } else if (resolve(attr('value'), scope)) {
    rendered = expand(body, scope)
  }
  return (
    expand(tpl.slice(0, start), scope) + rendered + expand(tpl.slice(m.index + m[0].length), scope)
  )
}

function renderMockup(file) {
  const src = readFileSync(file, 'utf8')
  const title = src.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''
  const helmet = src.match(/<helmet>([\s\S]*?)<\/helmet>/)[1]
  const body = src.match(/<\/helmet>([\s\S]*?)<\/x-dc>/)[1]
  const code = src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]
  const Component = new Function('DCLogic', `${code}\nreturn Component`)(DCLogic)
  const vals = new Component({}).renderVals()
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><title>${title}</title>${helmet}</head><body>${expand(body, vals)}</body></html>`
}

// ── Capture ─────────────────────────────────────────────────────────────────
mkdirSync(out, { recursive: true })
copyFileSync('public/textures/grain-light.webp', `${out}/grain-light.webp`)
const shot = (palette, i, slug) => `${out}/${palette}/${String(i + 1).padStart(2, '0')}-${slug}.png`

const browser = await chromium.launch()
try {
  for (const palette of palettes) {
    mkdirSync(`${out}/${palette}/html`, { recursive: true })
    for (const [i, { slug, mockup, path }] of pages.entries()) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      page.on('pageerror', (error) => console.log(`  page error: ${error.message.slice(0, 120)}`))
      page.setDefaultTimeout(300_000)
      if (mockup) {
        const file = `${out}/${palette}/html/${slug}.html`
        writeFileSync(file, recolour(renderMockup(mockup), palette))
        // The mockups load their faces from Google Fonts: make sure every one arrived (a slow
        // stylesheet otherwise leaves the signature in a fallback serif).
        const faces = [
          "300 20px 'Fraunces'",
          "italic 300 20px 'Fraunces'",
          "400 16px 'Manrope'",
          "600 16px 'Manrope'",
          "20px 'Amiri'",
          "40px 'Mrs Saint Delafield'",
        ]
        const url = new URL(file, `file:///${process.cwd().replace(/\\/g, '/')}/`).href
        for (let attempt = 1; ; attempt++) {
          await page.goto(url, { waitUntil: 'load' })
          const ok = await page.evaluate(async (list) => {
            await Promise.all(list.map((f) => document.fonts.load(f)))
            return list.every((f) => document.fonts.check(f))
          }, faces)
          if (ok) break
          if (attempt === 4) throw new Error(`${slug}: web fonts did not load`)
          console.log(`  ${slug}: fonts missing, reloading`)
        }
        await page.waitForTimeout(400)
      } else {
        const query = `?photos=off${palette === 'current' ? '' : `&palette=${palette}`}`
        // A slow or unreachable database can fail or stall a render: retry rather than capture
        // an error page.
        for (let attempt = 1; ; attempt++) {
          const status = await page
            .goto(`${base}${path}${query}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
            .then((response) => (response?.ok() ? 'ok' : `HTTP ${response?.status()}`))
            .catch(() => 'timeout')
          if (status === 'ok') break
          if (attempt === 6) throw new Error(`${slug}: ${status}`)
          console.log(`  ${slug}: ${status}, retrying`)
          await page.waitForTimeout(15_000)
        }
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(1200)
        // The dev server may reload a page once after compiling it: make sure the switches held.
        const state = () =>
          page.evaluate(() => [
            document.documentElement.dataset.palette ?? 'current',
            document.documentElement.dataset.photos,
          ])
        if ((await state()).join() !== `${palette},off`) {
          await page.reload({ waitUntil: 'domcontentloaded' })
          await page.waitForTimeout(1500)
        }
        const [set, photos] = await state()
        if (set !== palette || photos !== 'off')
          throw new Error(`${slug}: palette=${set} photos=${photos} at ${page.url()}`)
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 400) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 60))
          }
          window.scrollTo(0, 0)
        })
        // Full-page captures draw fixed elements where the page was scrolled, so the bottom
        // bar would land mid-page: stretch the viewport to the page instead, which keeps the
        // bar at the real bottom. The dev-tools badge is hidden.
        await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
        const height = await page.evaluate(() => document.documentElement.scrollHeight)
        await page.setViewportSize({ width: 390, height })
        await page.waitForTimeout(600)
      }
      await page.screenshot({ path: shot(palette, i, slug), fullPage: true })
      console.log(shot(palette, i, slug))
      await context.close()
    }
  }

  // ── Side-by-side comparisons (390 px per labelled column) ────────────────
  const LABEL = 64
  const GAP = 24
  const label = (text) =>
    Buffer.from(
      `<svg width="390" height="${LABEL}" xmlns="http://www.w3.org/2000/svg"><text x="195" y="42" font-family="Georgia, serif" font-size="30" text-anchor="middle" fill="#2a2521">${text}</text></svg>`,
    )
  for (const [i, { slug }] of pages.entries()) {
    const shots = await Promise.all(
      palettes.map((p) =>
        sharp(shot(p, i, slug))
          .resize({ width: 390 })
          .toBuffer(),
      ),
    )
    const heights = await Promise.all(shots.map(async (s) => (await sharp(s).metadata()).height))
    const file = `${out}/compare-${String(i + 1).padStart(2, '0')}-${slug}.png`
    await sharp({
      create: {
        width: palettes.length * 390 + (palettes.length + 1) * GAP,
        height: LABEL + Math.max(...heights) + GAP,
        channels: 3,
        background: '#ffffff',
      },
    })
      .composite(
        palettes.flatMap((p, c) => [
          { input: label(p), left: GAP + c * (390 + GAP), top: 0 },
          { input: shots[c], left: GAP + c * (390 + GAP), top: LABEL },
        ]),
      )
      .png()
      .toFile(file)
    console.log(file)
  }

  // ── One PDF per palette: each page is one full screenshot, 390 px wide ───
  const pdfPage = await browser.newPage()
  for (const palette of palettes) {
    const parts = await Promise.all(
      pages.map(async ({ slug }, i) => {
        const img = sharp(shot(palette, i, slug))
        const { width, height } = await img.metadata()
        const jpeg = await img.jpeg({ quality: 82, mozjpeg: true }).toBuffer()
        return {
          name: `p${i}`,
          h: Math.round((height * 390) / width),
          src: `data:image/jpeg;base64,${jpeg.toString('base64')}`,
        }
      }),
    )
    const html = `<!doctype html><html><head><style>
      html,body{margin:0}
      ${parts.map((p) => `@page ${p.name}{size:390px ${p.h}px;margin:0}`).join('\n')}
      img{display:block;width:390px;break-after:page}
      img:last-child{break-after:auto}
      ${parts.map((p) => `.${p.name}{page:${p.name};height:${p.h}px}`).join('\n')}
    </style></head><body>${parts.map((p) => `<img class="${p.name}" src="${p.src}">`).join('')}</body></html>`
    await pdfPage.setContent(html, { waitUntil: 'load' })
    const file = `${out}/palette-${palette}.pdf`
    await pdfPage.pdf({ path: file, preferCSSPageSize: true, printBackground: true })
    console.log(file)
  }
} finally {
  await browser.close()
}
