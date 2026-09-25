/**
 * Scroll-performance check on an emulated mid-range Android phone:
 * 390×844, 4× CPU slowdown (Chrome DevTools throttling), full motion enabled.
 *   node scripts/scroll-perf.mjs [baseUrl]
 * Scrolls each page top to bottom at a steady finger-like speed and reports frame times
 * sampled with requestAnimationFrame, plus long main-thread tasks (> 50 ms) during the scroll.
 */
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:3000'
const browser = await chromium.launch()

try {
  for (const path of ['/en', '/ar']) {
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
    await page.goto(base + path, { waitUntil: 'networkidle' })
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
      await new Promise((done) => {
        const step = (now) => {
          frames.push(now - last)
          last = now
          const y = Math.min(total, (now - startTime) * pxPerMs)
          window.scrollTo(0, y)
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
        pageHeight: total + innerHeight,
      }
    })

    console.log(
      `${path}: ${result.frames} frames over ${result.pageHeight}px | p50 ${result.p50.toFixed(1)} ms | ` +
        `p95 ${result.p95.toFixed(1)} ms | frames > 33 ms: ${result.over33} | long tasks during scroll: ${
          result.longTasks.length ? result.longTasks.join(', ') + ' ms' : 'none'
        }`,
    )
    await context.close()
  }
} finally {
  await browser.close()
}
