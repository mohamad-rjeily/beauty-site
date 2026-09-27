import { BookingPage, dict, expect, test, testName } from './helpers/fixtures'

/**
 * 3. Two customers pick the same time and press "Send" at the same moment. Exactly one
 * booking is saved; the other customer gets the friendly "just taken" message, back on the
 * times, with fresh times that no longer offer the taken one.
 */
test('double booking: same slot, same moment, exactly one wins', async ({ newVisitor, api, slotServices }) => {
  test.skip(slotServices.length === 0, 'No active time-slot service.')
  const service = slotServices[0]
  const pages = [await newVisitor(), await newVisitor()]
  const flows = pages.map((p) => new BookingPage(p, 'en'))
  const names = [testName('race A'), testName('race B')]

  await Promise.all(flows.map((f) => f.goto(service.slug)))
  const slot = await flows[0].pickSlot({ day: 'last', which: 'last' })
  await flows[1].pickSlot({ day: slot.dateKey, which: slot.time })
  await flows[0].fillDetails({ name: names[0], phone: '+961 3 123 456' })
  await flows[1].fillDetails({ name: names[1], phone: '+961 71 123 456' })

  await Promise.all(flows.map((f) => f.submitButton.click()))

  // Each side ends as either "sent" or "just taken".
  const outcomes = await Promise.all(
    flows.map(async (f) => {
      const taken = f.page.getByRole('alert').filter({ hasText: dict.en.booking.slotTaken })
      await expect(f.doneHeading.or(taken)).toBeVisible()
      return (await f.doneHeading.isVisible()) ? 'sent' : 'taken'
    }),
  )
  expect([...outcomes].sort(), 'one sent, one told the time was taken').toEqual(['sent', 'taken'])

  const saved = [...(await api.bookingsNamed(names[0])), ...(await api.bookingsNamed(names[1]))]
  expect(saved, 'exactly one booking saved').toHaveLength(1)
  expect(new Date(saved[0].startTime!).getTime()).toBe(slot.instant)

  // The loser is back on the times, freshly loaded, without the taken one.
  const loser = flows[outcomes.indexOf('taken')]
  await loser.expectOpen(2)
  await expect(loser.timeChips.first().or(loser.page.getByText(dict.en.booking.noTimes.split('{')[0]))).toBeVisible()
  const keys = await loser.tileDates()
  const index = keys.indexOf(slot.dateKey)
  if (await loser.isTileOpen(index)) {
    await loser.selectDay(index)
    expect(await loser.chipTimes(), 'taken time no longer offered').not.toContain(slot.time)
  }
})
