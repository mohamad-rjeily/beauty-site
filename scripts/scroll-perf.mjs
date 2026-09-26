/**
 * Scroll-performance check on an emulated mid-range Android phone:
 * 390×844, 4× CPU slowdown (Chrome DevTools throttling), full motion enabled.
 *   node scripts/scroll-perf.mjs [baseUrl] [page ...]
 * Pages are paths without the language (default: every public page), each run in English and
 * Arabic. Scrolls each page top to bottom at a steady finger-like speed and reports frame
 * times sampled with requestAnimationFrame, long main-thread tasks (> 50 ms) during the
 * scroll, and how many elements were caught mid-animation halfway down (proof that the
 * scroll-linked effects are running).
 */
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:3000'
const pages = args.filter((a) => a.startsWith('/'))
const paths = (pages.length ? pages : ['', '/services', '/gallery', '/about', '/contact']).flatMap(
  (page) => [`/en${page}`, `/ar${page}`],
)
const browser = await chromium.launch()

try {
  for (const path of paths) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.75,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'no-preference',
    })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    // 'load' plus a pause rather than 'networkidle': the dev server keeps a live connection.
    await page.goto(base + path, { waitUntil: 'load' })
    await page.waitForTimeout(2500) // let the load animations finish

    const result = await page.evaluate(async () => {
      const longTasks = []
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push(Math.round(entry.duration))
      })
      observer.observe({ type: 'longtask', buffered: false })

      const frames = []
      const total = document.documentElement.scrollHeight - innerHeight
      const pxPerMs = 1.2 // a steady, fairly quick thumb scroll
      let last = performance.now()
      const startTime = last
      let midway = -1
      // Opacity strictly between 0 and 1 means an element is part-way through its reveal.
      const inMotion = () =>
        [...document.querySelectorAll('main *')].filter((el) => {
          const o = Number(getComputedStyle(el).opacity)
          return o > 0.01 && o < 0.99
        }).length
      await new Promise((done) => {
        const step = (now) => {
          frames.push(now - last)
          last = now
          const y = Math.min(total, (now - startTime) * pxPerMs)
          window.scrollTo(0, y)
          if (midway < 0 && y >= total / 2) midway = inMotion()
          if (y >= total) done()
          else requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      })
      observer.disconnect()

      const sorted = frames.slice(1).sort((a, b) => a - b)
      const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
      return {
        frames: sorted.length,
        p50: pct(0.5),
        p95: pct(0.95),
        over33: sorted.filter((f) => f > 33.4).length,
        longTasks,
        midway,
        pageHeight: total + innerHeight,
      }
    })

    console.log(
      `${path}: ${result.frames} frames over ${result.pageHeight}px | p50 ${result.p50.toFixed(1)} ms | ` +
        `p95 ${result.p95.toFixed(1)} ms | frames > 33 ms: ${result.over33} | long tasks during scroll: ${
          result.longTasks.length ? result.longTasks.join(', ') + ' ms' : 'none'
        } | mid-animation at half-way: ${result.midway}`,
    )
    await context.close()
  }
} finally {
  await browser.close()
}
