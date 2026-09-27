import type { Page } from '@playwright/test'

import {
  BookingPage,
  dict,
  englishLeaks,
  expect,
  plain,
  test,
  testName,
  type Locale,
} from './helpers/fixtures'

/**
 * 2. Arabic: <html lang="ar" dir="rtl">, no English in the booking flow at any step, steps in
 * order, the Change (back) buttons and directional pieces behave in right-to-left.
 */

/**
 * Text a customer can perceive in the booking area (flow, summary aside, done screen): visible
 * text, screen-reader-only text and aria-labels. Content hidden from everyone (aria-hidden,
 * like the invisible honeypot field for bots) is left out.
 */
const flowText = async (page: Page) =>
  page.evaluate(() => {
    const roots = [
      ...document.querySelectorAll('ol:has(> li h2), aside'),
      ...document.querySelectorAll('.motion-step'),
    ] as HTMLElement[]
    return roots
      .map((root) => {
        const copy = root.cloneNode(true) as HTMLElement
        copy.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove())
        const labels = [...copy.querySelectorAll('[aria-label], [title]')].flatMap((el) => [
          el.getAttribute('aria-label') ?? '',
          el.getAttribute('title') ?? '',
        ])
        return [copy.textContent ?? '', ...labels].join('\n')
      })
      .join('\n')
  })

test('Arabic: rtl, lang and no English at any step', async ({ page, api, slotServices }, testInfo) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const services = await api.services('ar')
  const service = services.find((s) => s.id === slotServices[0].id)!
  const settings = await api.settings('ar')
  const allowed = [
    ...services.map((s) => s.name),
    await api.ownerName('ar'),
    settings.brandName ?? '',
  ]
  const b = new BookingPage(page, 'ar')
  const name = testName('ar leaks')
  const leaks: Record<string, string[]> = {}
  const check = async (step: string, extra: string[] = []) => {
    const found = englishLeaks(await flowText(page), [...allowed, ...extra])
    if (found.length) leaks[step] = found
  }

  await b.goto()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await check('1 service')

  await b.chooseService(service)
  await check('2 time')

  await b.pickSlot({ day: 'last', which: 'first' })
  await check('3 details')

  // Empty form: the error messages must be Arabic too.
  await b.submit()
  await expect(page.getByText(dict.ar.booking.errors.name)).toBeVisible()
  await b.shot(testInfo, '03b-details-errors')
  await check('3 details, errors')

  await b.fillDetails({ name, phone: '+961 3 123 456' })
  await b.submit()
  await b.expectDone()
  await check('4 done', [name])

  expect(leaks, 'English words in the Arabic booking flow, per step').toEqual({})
})

test('English: errors screenshot for comparison', async ({ page, slotServices }, testInfo) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const b = new BookingPage(page, 'en')
  await b.goto()
  await b.chooseService(slotServices[0])
  await b.pickSlot({ day: 'last', which: 'first' })
  await b.submit()
  await expect(page.getByText(dict.en.booking.errors.name)).toBeVisible()
  await b.shot(testInfo, '03b-details-errors')
})

for (const locale of ['ar', 'en'] as Locale[]) {
  test(`steps order and Change buttons (${locale})`, async ({ page, api, slotServices }) => {
    test.skip(slotServices.length === 0, 'No active time-slot service.')
    const service = (await api.services(locale)).find((s) => s.id === slotServices[0].id)!
    const b = new BookingPage(page, locale)
    const t = dict[locale].booking
    const rtl = locale === 'ar'

    await b.goto()

    // Steps 1, 2, 3 from top to bottom, with the right titles.
    const titles = await b.flow.locator(':scope > li h2').allInnerTexts()
    expect(titles.map((x) => x.replace(/^.*:\s*/, '').trim())).toEqual([
      t.steps.service,
      t.steps.time,
      t.steps.details,
    ])
    const tops = await b.flow
      .locator(':scope > li')
      .evaluateAll((lis) => lis.map((li) => li.getBoundingClientRect().top))
    expect([...tops].sort((x, y) => x - y)).toEqual(tops)

    await b.chooseService(service)

    // Day strip: today is at the reading start (right in Arabic), later days follow.
    const first = await b.dayTiles.nth(0).boundingBox()
    const second = await b.dayTiles.nth(1).boundingBox()
    expect(rtl ? first!.x > second!.x : first!.x < second!.x, 'later days at the reading end').toBe(true)

    // Done step 1: its number badge at the reading start, Change at the reading end.
    const row = b.step(1).locator(':scope > div')
    const badge = await row.locator(':scope > span').first().boundingBox()
    const change = b.step(1).getByRole('button', { name: new RegExp(`^${t.change}`) })
    const changeBox = await change.boundingBox()
    expect(rtl ? badge!.x > changeBox!.x : badge!.x < changeBox!.x, 'Change at the reading end').toBe(true)

    const picked = await b.pickSlot({ day: 'first', which: 'first' })

    // The submit arrow points the reading direction (mirrored in Arabic).
    const arrowScale = await b.submitButton.locator('svg').evaluate((svg) => getComputedStyle(svg).scale)
    expect(arrowScale.startsWith('-1'), `arrow mirrored in ${locale}: scale=${arrowScale}`).toBe(rtl)

    // Change on step 2 goes back to the times with the same day still chosen.
    await b.step(2).getByRole('button', { name: new RegExp(`^${t.change}`) }).click()
    await b.expectOpen(2)
    await expect(b.dayTiles.nth(picked.dayIndex)).toHaveAttribute('aria-pressed', 'true')

    // Change on step 1 goes back to the services; picking one again moves forward again.
    await b.chip(picked.time).click()
    await b.expectOpen(3)
    await b.step(1).getByRole('button', { name: new RegExp(`^${t.change}`) }).click()
    await b.expectOpen(1)
    await expect(b.serviceOption(service.name)).toBeVisible()
    await b.chooseService(service)
    await b.expectOpen(2)
    await expect(page.getByRole('heading', { name: plain(t.doneSlot) })).toHaveCount(0)
  })
}
