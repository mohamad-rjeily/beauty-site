import {
  expect,
  test as base,
  type Browser,
  type BrowserContextOptions,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { ar } from '../../src/i18n/dictionaries/ar'
import { en, type Dictionary } from '../../src/i18n/dictionaries/en'
import { TEST_PREFIX, TEST_VISITOR_IPS } from '../visitors'
import { Api, type Service } from './api'
import { addDays, beirutInstant, dateKey, toMinutes, type Rules } from './beirut'

export type Locale = 'en' | 'ar'
export const dict: Record<Locale, Dictionary> = { en, ar }

/** "Booking *sent.*" -> "Booking sent." (how Emphasis renders it). */
export const plain = (text: string) => text.replace(/\*/g, '')

/**
 * Latin words left in Arabic text once the allowed data is removed: the given strings
 * (service names, customer name...), "[PLACEHOLDER]" tokens, and the "US$" currency sign
 * that Intl uses for dollars in Arabic.
 */
export const englishLeaks = (text: string, allowed: string[] = []): string[] => {
  let rest = text
  for (const a of [...allowed].filter(Boolean).sort((x, y) => y.length - x.length)) {
    rest = rest.split(a).join(' ')
  }
  rest = rest.replace(/\[[A-Z_]+\]/g, ' ').replace(/US\$/g, ' ')
  return rest.match(/[A-Za-z]{2,}/g) ?? []
}

/** A unique, clean-up-able customer name: "E2E-TEST <label> <random>". */
export const testName = (label: string) => `${TEST_PREFIX} ${label} ${randomBytes(3).toString('hex')}`

// ── Fake visitor IPs ────────────────────────────────────────────────────────
// A counter in a file (reset by the global setup), so a worker restarted after a failure
// never reuses an address that already has rate-limit hits.
const COUNTER = 'test-results/.visitor-counter'
export const nextVisitorIp = (): string => {
  const used = existsSync(COUNTER) ? Number(readFileSync(COUNTER, 'utf8')) || 0 : 0
  if (used >= TEST_VISITOR_IPS.length) throw new Error('Out of test visitor IPs.')
  writeFileSync(COUNTER, String(used + 1))
  return TEST_VISITOR_IPS[used]
}

/** Context options of the current project (Pixel 7 or desktop), for extra visitors. */
const deviceOptions = (testInfo: TestInfo): BrowserContextOptions => {
  const u = testInfo.project.use
  return {
    viewport: u.viewport,
    userAgent: u.userAgent,
    deviceScaleFactor: u.deviceScaleFactor,
    isMobile: u.isMobile,
    hasTouch: u.hasTouch,
    timezoneId: u.timezoneId,
    baseURL: u.baseURL,
  }
}

// ── The booking page ────────────────────────────────────────────────────────
export type PickedSlot = { dateKey: string; time: string; instant: number; dayIndex: number }

const WESTERN = (s: string) =>
  s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .replace(/[^\d:]/g, '')

export class BookingPage {
  readonly t: Dictionary['booking']
  readonly flow: Locator
  readonly dayTiles: Locator
  readonly timeChips: Locator
  readonly nameInput: Locator
  readonly phoneInput: Locator
  readonly notesInput: Locator
  readonly submitButton: Locator
  readonly notice: Locator
  readonly doneHeading: Locator

  constructor(
    readonly page: Page,
    readonly locale: Locale,
  ) {
    this.t = dict[locale].booking
    this.flow = page.locator('ol').filter({ has: page.locator(':scope > li h2') }).first()
    this.dayTiles = page.locator('[aria-labelledby="book-days"] > button')
    this.timeChips = page.locator('[aria-labelledby="book-times"] > button')
    this.nameInput = page.locator('#book-name')
    this.phoneInput = page.locator('#book-phone')
    this.notesInput = page.locator('#book-notes')
    this.submitButton = page.locator('form button[type="submit"]')
    this.notice = page.getByRole('alert').filter({ hasNotText: /^$/ })
    this.doneHeading = page.getByRole('heading', {
      name: new RegExp(`${plain(this.t.doneSlot)}|${plain(this.t.doneRequest)}`.replace(/\./g, '\\.')),
    })
  }

  step(n: 1 | 2 | 3): Locator {
    return this.flow.locator(':scope > li').nth(n - 1)
  }

  /** The open step's number (the one showing its controls). */
  async openStep(): Promise<number> {
    for (const n of [1, 2, 3] as const) {
      if ((await this.step(n).locator(':scope > fieldset').count()) > 0) return n
    }
    return 0
  }

  async expectOpen(n: 1 | 2 | 3) {
    await expect(this.step(n).locator(':scope > fieldset')).toBeVisible()
  }

  /** Opens /<locale>/book (optionally ?service=slug) and waits until React is running. */
  async goto(slug?: string) {
    await this.page.goto(`/${this.locale}/book${slug ? `?service=${encodeURIComponent(slug)}` : ''}`)
    await this.ready()
  }

  async ready() {
    await expect(this.flow.locator(':scope > li > fieldset:not([disabled])')).toHaveCount(1)
  }

  serviceOption(name: string): Locator {
    return this.page.locator('label').filter({ has: this.page.getByText(name, { exact: true }) })
  }

  async chooseService(service: Pick<Service, 'name' | 'bookingMode'>) {
    await this.serviceOption(service.name).click()
    await this.expectOpen(2)
    if (service.bookingMode === 'slot') await this.waitForDays()
  }

  async waitForDays() {
    await expect(this.dayTiles.first()).toBeVisible()
  }

  /** Beirut date of every day tile. The first tile is today (the server's Beirut date). */
  async tileDates(): Promise<string[]> {
    const count = await this.dayTiles.count()
    // The tile shows the day of the month; today or, right around midnight, tomorrow.
    const firstDay = Number(WESTERN((await this.dayTiles.first().locator('span').nth(1).innerText()).trim()))
    const today = dateKey(Date.now())
    const first = [today, addDays(today, 1), addDays(today, -1)].find(
      (k) => Number(k.slice(8)) === firstDay,
    )
    if (!first) throw new Error(`First day tile (${firstDay}) is not today in Beirut (${today}).`)
    return Array.from({ length: count }, (_, i) => addDays(first, i))
  }

  async isTileOpen(i: number): Promise<boolean> {
    return (await this.dayTiles.nth(i).getAttribute('data-closed')) === null
  }

  async openTileIndexes(): Promise<number[]> {
    const states = await this.dayTiles.evaluateAll((tiles) =>
      tiles.map((t) => !t.hasAttribute('data-closed')),
    )
    return states.flatMap((open, i) => (open ? [i] : []))
  }

  async selectDay(i: number) {
    await this.dayTiles.nth(i).click()
    await expect(this.dayTiles.nth(i)).toHaveAttribute('aria-pressed', 'true')
    await expect(this.timeChips.first()).toBeVisible()
  }

  /** The chosen day's times as "HH:mm" (Western digits). */
  async chipTimes(): Promise<string[]> {
    return (await this.timeChips.allInnerTexts()).map((t) => WESTERN(t))
  }

  /** Times of day `i` as UTC instants. */
  async instantsOn(i: number, keys: string[]): Promise<number[]> {
    await this.selectDay(i)
    return (await this.chipTimes()).map((t) => beirutInstant(keys[i], toMinutes(t)) as number)
  }

  chip(time: string): Locator {
    return this.timeChips.filter({ hasText: new RegExp(`^\\s*${time}\\s*$`) })
  }

  /**
   * Picks a free time. `day`: which open day (first / last / index among open days / a date
   * key); `which`: which time of that day.
   */
  async pickSlot({
    day = 'first',
    which = 'first',
  }: {
    day?: 'first' | 'last' | number | string
    which?: 'first' | 'middle' | 'last' | string
  } = {}): Promise<PickedSlot> {
    await this.waitForDays()
    const keys = await this.tileDates()
    const open = await this.openTileIndexes()
    if (open.length === 0) throw new Error('No open day on the booking page.')
    const dayIndex =
      typeof day === 'string' && day.includes('-')
        ? keys.indexOf(day)
        : day === 'first'
          ? open[0]
          : day === 'last'
            ? open[open.length - 1]
            : open[Math.min(day as number, open.length - 1)]
    if (dayIndex < 0 || !open.includes(dayIndex)) throw new Error(`Day ${day} is not open.`)
    await this.selectDay(dayIndex)
    const times = await this.chipTimes()
    const time =
      which === 'first'
        ? times[0]
        : which === 'last'
          ? times[times.length - 1]
          : which === 'middle'
            ? times[Math.floor(times.length / 2)]
            : which
    if (!times.includes(time)) throw new Error(`${time} is not offered on ${keys[dayIndex]}.`)
    await this.chip(time).click()
    await this.expectOpen(3)
    return {
      dateKey: keys[dayIndex],
      time,
      instant: beirutInstant(keys[dayIndex], toMinutes(time)) as number,
      dayIndex,
    }
  }

  async fillDetails({ name, phone, notes }: { name: string; phone: string; notes?: string }) {
    await this.nameInput.fill(name)
    await this.phoneInput.fill(phone)
    if (notes !== undefined) await this.notesInput.fill(notes)
  }

  async submit() {
    await this.submitButton.click()
  }

  async expectDone() {
    await expect(this.doneHeading).toBeVisible()
  }

  /**
   * Screenshots in test-results/screens/: <project>-<locale>-<name>.png is what the phone
   * shows (the viewport); ...-full.png is the whole page. Full-page captures draw the sticky
   * header where the page was scrolled, so judge overlaps on the viewport one.
   */
  async shot(testInfo: TestInfo, name: string) {
    const path = `test-results/screens/${testInfo.project.name}-${this.locale}-${name}`
    await this.page.waitForTimeout(400) // let the step's entrance and scroll settle
    await this.page.screenshot({ path: `${path}.png`, animations: 'disabled' })
    await this.page.screenshot({ path: `${path}-full.png`, fullPage: true, animations: 'disabled' })
  }
}

// ── Fixtures ────────────────────────────────────────────────────────────────
type Fixtures = {
  /** A fresh browser context for another visitor (own IP, same device as the project). */
  newVisitor: () => Promise<Page>
  rules: Rules
  slotServices: Service[]
  requestServices: Service[]
}
type WorkerFixtures = { api: Api }

export const test = base.extend<Fixtures, WorkerFixtures>({
  // Every context of every test gets its own fake visitor IP (see e2e/visitors.ts).
  extraHTTPHeaders: async ({}, provide) => {
    await provide({ 'x-forwarded-for': nextVisitorIp() })
  },

  api: [
    async ({}, provide, workerInfo) => {
      const api = await Api.login(workerInfo.project.use.baseURL as string)
      await provide(api)
      await api.dispose()
    },
    { scope: 'worker' },
  ],

  newVisitor: async ({ browser }, provide, testInfo) => {
    const contexts: Awaited<ReturnType<Browser['newContext']>>[] = []
    await provide(async () => {
      const context = await browser.newContext({
        ...deviceOptions(testInfo),
        extraHTTPHeaders: { 'x-forwarded-for': nextVisitorIp() },
      })
      contexts.push(context)
      return context.newPage()
    })
    await Promise.all(contexts.map((c) => c.close()))
  },

  rules: async ({ api }, provide) => {
    await provide(await api.rules())
  },

  // The global setup already stops the run without these (scripts/e2e-db.ts); this is a
  // backstop, so a test never skips quietly for lack of data.
  slotServices: async ({ api }, provide) => {
    const found = (await api.services('en')).filter((s) => s.bookingMode === 'slot')
    if (found.length === 0) throw new Error('No active time-slot service: run npm run demo:seed first.')
    await provide(found)
  },

  requestServices: async ({ api }, provide) => {
    const found = (await api.services('en')).filter((s) => s.bookingMode === 'request')
    if (found.length === 0) throw new Error('No active request service: run npm run demo:seed first.')
    await provide(found)
  },
})

export { expect }
