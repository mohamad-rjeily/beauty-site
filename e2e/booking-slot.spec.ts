import { formatWhen, MINUTE } from './helpers/beirut'
import {
  BookingPage,
  dict,
  englishLeaks,
  expect,
  test,
  testName,
  type Locale,
} from './helpers/fixtures'

/**
 * 1. The main flow, time-slot service, in English and Arabic: service -> time -> details ->
 * sent. The booking is saved with the right times, and the WhatsApp button carries a correct
 * summary in the page's language. Screenshots of every step go to test-results/screens/.
 */
for (const locale of ['en', 'ar'] as Locale[]) {
  test(`slot booking: full flow (${locale}) @desktop`, async ({ page, api, rules, slotServices }, testInfo) => {
    test.skip(slotServices.length === 0, 'No active time-slot service in the database.')
    const serviceEn = slotServices[0]
    const service = (await api.services(locale)).find((s) => s.id === serviceEn.id)!
    const b = new BookingPage(page, locale)
    const name = testName(`slot ${locale}`)

    await b.goto()
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
    await b.expectOpen(1)
    await b.shot(testInfo, '01-service')

    await b.chooseService(service)
    await b.shot(testInfo, '02-time')

    const slot = await b.pickSlot({ day: 'last', which: 'middle' })
    await b.fillDetails({ name, phone: '+961 3 123 456', notes: 'E2E note' })
    await b.shot(testInfo, '03-details')

    await b.submit()
    await b.expectDone()
    await b.shot(testInfo, '04-done')

    // ── Saved with the right times ───────────────────────────────────────────
    const saved = await api.bookingsNamed(name)
    expect(saved, 'exactly one booking saved').toHaveLength(1)
    const booking = saved[0]
    expect(booking.status).toBe('pending')
    expect(booking.mode).toBe('slot')
    expect(booking.service).toBe(service.id)
    expect(booking.phone).toBe('+9613123456')
    expect(new Date(booking.startTime!).getTime(), 'start = the chosen time').toBe(slot.instant)
    expect(new Date(booking.endTime!).getTime(), 'end = start + duration').toBe(
      slot.instant + service.duration * MINUTE,
    )
    expect(new Date(booking.occupiedUntil!).getTime(), 'busy until = end + break').toBe(
      slot.instant + (service.duration + rules.bufferMinutes) * MINUTE,
    )

    // ── WhatsApp summary ─────────────────────────────────────────────────────
    const settings = await api.settings(locale)
    expect(settings.whatsappNumber, 'a WhatsApp number in Site settings (npm run demo:seed)').toBeTruthy()
    const link = page.locator('a[href^="https://wa.me/"]').filter({ hasText: dict[locale].booking.sendOnWhatsApp })
    await expect(link).toBeVisible()
    const href = new URL((await link.getAttribute('href'))!)
    expect(href.pathname.slice(1), 'sent to the owner number').toBe(
      settings.whatsappNumber!.replace(/\D/g, ''),
    )
    const text = href.searchParams.get('text') ?? ''
    const s = dict[locale].booking.summary
    const t = dict[locale].booking
    expect(text.startsWith(t.whatsappIntroSlot), 'intro in the page language').toBe(true)
    expect(text).toContain(`• ${s.service}: ${service.name}`)
    expect(text).toContain(`• ${s.when}: ${formatWhen(slot.instant, locale)}`)
    expect(text).toContain(`• ${s.name}: ${name}`)
    expect(text).toContain(`• ${s.phone}: +961 3 123 456`)
    expect(text).toContain(`• ${s.notes}: E2E note`)
    expect(text.trim().endsWith(t.whatsappOutro)).toBe(true)

    if (locale === 'ar') {
      // Nothing English but the data itself (service name, customer name, notes).
      expect(
        englishLeaks(text, [service.name, name, 'E2E note']),
        'English words in the Arabic WhatsApp message',
      ).toEqual([])
    }
  })
}
