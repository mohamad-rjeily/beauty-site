import { BookingPage, expect, test, type Locale } from './helpers/fixtures'

/**
 * 12. Every "Book" button on Home and Services, in English and Arabic, leads to the booking
 * page in the same language; a button that belongs to a service opens with that service
 * chosen (step 2 open). Category buttons land on that category's group.
 * (There are no separate service pages: services are listed on /services.)
 */

type Found = { href: string; text: string; owner: string }

for (const locale of ['en', 'ar'] as Locale[]) {
  for (const path of ['', '/services']) {
    test(`Book buttons on ${path || '/'} (${locale})`, async ({ page, api }) => {
      const services = await api.services(locale)
      await page.goto(`/${locale}${path}`)

      const links: Found[] = await page.locator('a[href*="/book"]').evaluateAll((anchors) =>
        anchors.map((a) => ({
          href: a.getAttribute('href') ?? '',
          text: (a as HTMLElement).innerText.trim(),
          // The closest list item or card around the button (for service buttons).
          owner: ((a.closest('li') ?? a.parentElement) as HTMLElement | null)?.innerText ?? '',
        })),
      )
      expect(links.length, 'there are Book buttons on the page').toBeGreaterThan(0)

      const problems: string[] = []
      for (const link of links) {
        const url = new URL(link.href, 'http://x')
        if (url.pathname !== `/${locale}/book`) problems.push(`"${link.text}" -> ${link.href} (wrong page or language)`)
        const slug = url.searchParams.get('service')
        if (slug) {
          const service = services.find((s) => s.slug === slug)
          if (!service) problems.push(`"${link.text}" -> unknown service "${slug}"`)
          else if (!link.owner.includes(service.name)) {
            problems.push(`"${link.text}" -> ${slug}, but sits next to a different service`)
          }
        }
        if (url.hash && !/^#book-(makeup|skincare)$/.test(url.hash)) problems.push(`${link.href}: unknown anchor`)
      }
      expect(problems).toEqual([])

      if (path === '/services') {
        const linked = new Set(links.map((l) => new URL(l.href, 'http://x').searchParams.get('service')))
        const missing = services.filter((s) => !linked.has(s.slug)).map((s) => s.slug)
        expect(missing, 'every active service has its own Book button').toEqual([])
      }

      // Follow every distinct target.
      const b = new BookingPage(page, locale)
      for (const href of [...new Set(links.map((l) => l.href))]) {
        const url = new URL(href, 'http://x')
        await page.goto(href)
        await b.ready()
        const slug = url.searchParams.get('service')
        if (slug) {
          const service = services.find((s) => s.slug === slug)!
          // Once chosen, step 1 folds into a line showing the service.
          await b.expectOpen(2)
          await expect(b.step(1), `${href}: service preselected`).toContainText(service.name)
        } else {
          await b.expectOpen(1)
          if (url.hash) await expect(page.locator(url.hash)).toBeAttached()
        }
      }
    })
  }
}
