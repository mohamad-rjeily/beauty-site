/**
 * Review captures only: adds clearly labelled TEST services, products and reviews so the
 * populated home-page states (marquee, service cards, product rail, review deck) can be
 * reviewed, then deletes exactly what it added.
 *   npm run payload -- run scripts/review-fixtures.ts set
 *   npm run payload -- run scripts/review-fixtures.ts restore
 * No images are created: photo slots keep their placeholders.
 */
import config from '@payload-config'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { getPayload } from 'payload'

type Created = { services: number[]; products: number[]; testimonials: number[] }

const BACKUP = '.impeccable/review/fixtures.backup.json'
const mode = process.argv.at(-1)
const payload = await getPayload({ config })

if (mode === 'set') {
  if (existsSync(BACKUP)) throw new Error('Fixtures already exist: run "restore" first.')
  const created: Created = { services: [], products: [], testimonials: [] }
  mkdirSync('.impeccable/review', { recursive: true })
  const save = () => writeFileSync(BACKUP, JSON.stringify(created))

  const services = [
    { name: 'TEST Bridal makeup', category: 'makeup', amount: 25000, duration: 120, ar: 'اختبار مكياج عروس' },
    { name: 'TEST Soirée makeup', category: 'makeup', amount: 8000, duration: 60, ar: 'اختبار مكياج سهرة' },
    { name: 'TEST Signature facial', category: 'skincare', amount: 6000, duration: 75, ar: 'اختبار جلسة وجه' },
  ] as const
  for (const [i, s] of services.entries()) {
    const doc = await payload.create({
      collection: 'services',
      locale: 'en',
      data: { name: s.name, category: s.category, price: { amount: s.amount, currency: 'USD' }, duration: s.duration, sortOrder: i } as never,
    })
    await payload.update({ collection: 'services', id: doc.id, locale: 'ar', data: { name: s.ar } })
    created.services.push(doc.id)
    save()
  }

  for (const [i, name] of ['TEST Rose clay mask', 'TEST Hydrating serum', 'TEST Lip tint'].entries()) {
    const doc = await payload.create({
      collection: 'products',
      locale: 'en',
      data: { name, price: { amount: 1800 + i * 700, currency: 'USD' }, type: 'brand', stockAdjustment: i === 2 ? 0 : 5 } as never,
    })
    await payload.update({ collection: 'products', id: doc.id, locale: 'ar', data: { name: name.replace('TEST', 'اختبار') } })
    created.products.push(doc.id)
    save()
  }

  for (const i of [1, 2, 3]) {
    const doc = await payload.create({
      collection: 'testimonials',
      locale: 'en',
      data: {
        clientName: `TEST client ${i}`,
        quote: `TEST review ${i}: placeholder text used only to check the layout of the review cards.`,
        context: 'TEST',
        rating: 5,
        published: true,
        sortOrder: i,
      },
    })
    await payload.update({
      collection: 'testimonials',
      id: doc.id,
      locale: 'ar',
      data: { clientName: `اختبار ${i}`, quote: `رأي اختبار ${i}: نص مؤقت لفحص تصميم البطاقات فقط.`, context: 'اختبار' },
    })
    created.testimonials.push(doc.id)
    save()
  }
  console.log('Fixtures set:', created)
} else if (mode === 'restore') {
  const created = JSON.parse(readFileSync(BACKUP, 'utf8')) as Created
  for (const id of created.testimonials) await payload.delete({ collection: 'testimonials', id })
  for (const id of created.products) await payload.delete({ collection: 'products', id })
  for (const id of created.services) await payload.delete({ collection: 'services', id })
  rmSync(BACKUP)
  const counts = await Promise.all(
    (['services', 'products', 'testimonials'] as const).map(async (c) => `${c}=${(await payload.count({ collection: c })).totalDocs}`),
  )
  console.log('Fixtures removed. Now:', counts.join(' '))
} else {
  throw new Error('Use "set" or "restore".')
}
process.exit(0)
