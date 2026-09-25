/**
 * Demo content for looking at the site before real content exists.
 *   npm run demo:seed    add clearly labelled DEMO content
 *   npm run demo:clear   delete all of it and put the database back exactly as before
 *
 * Every record has "DEMO" in its name. Photos are flat palette gradients labelled DEMO:
 * no faces, no fake results. What was created and the previous state of the two globals
 * are saved in .demo-seed.json (git-ignored); seeding twice is refused.
 */
import config from '@payload-config'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'

import type { Home, SiteSetting } from '../src/payload-types'

const STATE_FILE = '.demo-seed.json'

type GlobalSnapshot<T> = { existed: boolean; en?: T; ar?: T }
type State = {
  created: Record<
    'media' | 'services' | 'categories' | 'products' | 'testimonials' | 'gallery',
    number[]
  >
  siteSettings: GlobalSnapshot<SiteSetting>
  home: GlobalSnapshot<Home>
}

const mode = process.argv.at(-1)
const payload = await getPayload({ config })
const db = (payload.db as unknown as PostgresAdapter).drizzle

// ── Placeholder images ────────────────────────────────────────────────────
const PALETTES = {
  clay: ['#9c4f32', '#d9a58a'],
  sage: ['#5e6b55', '#b9c2ae'],
  sand: ['#a39480', '#ede6da'],
} as const
type Palette = keyof typeof PALETTES

const demoImage = async (label: string, palette: Palette, width: number, height: number) => {
  const [from, to] = PALETTES[palette]
  const size = Math.round(width / 11)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="46%" text-anchor="middle" font-family="Georgia, serif" font-size="${size}" fill="#fffcf7" fill-opacity="0.9" letter-spacing="${size / 5}">DEMO</text>
    <text x="50%" y="54%" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(size / 3)}" fill="#fffcf7" fill-opacity="0.85">${label}</text>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

const uploadDemo = async (
  state: State,
  label: string,
  palette: Palette,
  width: number,
  height: number,
  arAlt: string,
) => {
  const data = await demoImage(label, palette, width, height)
  const doc = await payload.create({
    collection: 'media',
    locale: 'en',
    data: { alt: `DEMO placeholder: ${label}` },
    file: {
      data,
      mimetype: 'image/png',
      name: `demo-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`,
      size: data.length,
    },
  })
  await payload.update({
    collection: 'media',
    id: doc.id,
    locale: 'ar',
    data: { alt: `صورة DEMO مؤقتة: ${arAlt}` },
  })
  state.created.media.push(doc.id)
  save(state)
  return doc.id
}

const save = (state: State) => writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))

/** A global's current values in both languages, and whether it was ever saved. */
const snapshot = async <T>(
  slug: 'site-settings' | 'home',
  table: string,
): Promise<GlobalSnapshot<T>> => {
  const rows = await db.execute(sql.raw(`SELECT count(*)::int AS n FROM ${table}`))
  const existed = (rows.rows[0] as { n: number }).n > 0
  if (!existed) return { existed }
  const read = (locale: 'en' | 'ar') =>
    payload.findGlobal({ slug, locale, fallbackLocale: false, depth: 0 }) as Promise<T>
  return { existed, en: await read('en'), ar: await read('ar') }
}

/** Only the fields a global update accepts (no id / timestamps / globalType). */
const editable = <T extends object>(doc: T) => {
  const {
    id: _id,
    createdAt: _c,
    updatedAt: _u,
    globalType: _g,
    ...rest
  } = doc as Record<string, unknown>
  return rest
}

const money = (amount: number) => ({ amount, currency: 'USD' as const })

// ── Seed ──────────────────────────────────────────────────────────────────
const seed = async () => {
  if (existsSync(STATE_FILE))
    throw new Error(`Demo content is already seeded (${STATE_FILE} exists). Run demo:clear first.`)

  const state: State = {
    created: {
      media: [],
      services: [],
      categories: [],
      products: [],
      testimonials: [],
      gallery: [],
    },
    siteSettings: await snapshot<SiteSetting>('site-settings', 'site_settings'),
    home: await snapshot<Home>('home', 'home'),
  }
  save(state)

  // Contact details
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'en',
    data: { whatsappNumber: '+9613000000', instagramUrl: 'https://www.instagram.com/demo.account' },
  })

  // Home photos. Both languages are written in full, so the Arabic text keeps its own defaults.
  const hero = await uploadDemo(state, 'Hero portrait', 'clay', 1200, 1600, 'الصورة الرئيسية')
  const intro = await uploadDemo(state, 'At work', 'sand', 800, 1170, 'أثناء العمل')
  const studio = [
    await uploadDemo(state, 'Studio entrance', 'sand', 600, 1000, 'مدخل الاستوديو'),
    await uploadDemo(state, 'Treatment room', 'sage', 600, 1400, 'غرفة العلاج'),
    await uploadDemo(state, 'Studio detail', 'clay', 600, 1000, 'تفصيل من الاستوديو'),
  ]
  const homeEn = await payload.findGlobal({ slug: 'home', locale: 'en', depth: 0 })
  const homeAr = await payload.findGlobal({ slug: 'home', locale: 'ar', depth: 0 })
  const photos = { heroPhoto: hero, introPhoto: intro, studioPhotos: studio }
  await payload.updateGlobal({
    slug: 'home',
    locale: 'en',
    data: { ...editable(homeEn), ...photos },
  })
  await payload.updateGlobal({
    slug: 'home',
    locale: 'ar',
    data: { ...editable(homeAr), ...photos },
  })

  // Services (one bridal "request" service)
  const services = [
    {
      en: 'DEMO Bridal makeup',
      ar: 'DEMO مكياج عروس',
      category: 'makeup',
      amount: 30000,
      duration: 180,
      mode: 'request',
      palette: 'clay',
    },
    {
      en: 'DEMO Soirée makeup',
      ar: 'DEMO مكياج سهرة',
      category: 'makeup',
      amount: 8000,
      duration: 60,
      mode: 'slot',
      palette: 'clay',
    },
    {
      en: 'DEMO Makeup lesson',
      ar: 'DEMO درس مكياج',
      category: 'makeup',
      amount: 12000,
      duration: 90,
      mode: 'slot',
      palette: 'sand',
    },
    {
      en: 'DEMO Signature facial',
      ar: 'DEMO جلسة وجه مميزة',
      category: 'skincare',
      amount: 6000,
      duration: 75,
      mode: 'slot',
      palette: 'sage',
    },
    {
      en: 'DEMO Skin consultation',
      ar: 'DEMO استشارة بشرة',
      category: 'skincare',
      amount: 3000,
      duration: 30,
      mode: 'slot',
      palette: 'sand',
    },
    {
      en: 'DEMO Glow course',
      ar: 'DEMO برنامج نضارة',
      category: 'skincare',
      amount: 20000,
      duration: 60,
      mode: 'slot',
      palette: 'sage',
    },
  ] as const
  const serviceIds: number[] = []
  for (const [i, s] of services.entries()) {
    const image = await uploadDemo(
      state,
      s.en.replace('DEMO ', ''),
      s.palette,
      800,
      1380,
      s.ar.replace('DEMO ', ''),
    )
    const doc = await payload.create({
      collection: 'services',
      locale: 'en',
      data: {
        name: s.en,
        category: s.category,
        bookingMode: s.mode,
        price: money(s.amount),
        duration: s.duration,
        images: [image],
        sortOrder: i,
        active: true,
      },
    })
    await payload.update({ collection: 'services', id: doc.id, locale: 'ar', data: { name: s.ar } })
    state.created.services.push(doc.id)
    serviceIds.push(doc.id)
    save(state)
  }

  // Product category + products (brand and homemade; two featured on home)
  const category = await payload.create({
    collection: 'categories',
    locale: 'en',
    data: { name: 'DEMO Skincare', slug: 'demo-skincare' },
  })
  await payload.update({
    collection: 'categories',
    id: category.id,
    locale: 'ar',
    data: { name: 'DEMO العناية بالبشرة' },
  })
  state.created.categories.push(category.id)
  save(state)

  const today = new Date()
  const inDays = (days: number) => new Date(today.getTime() + days * 86_400_000).toISOString()
  const products = [
    {
      en: 'DEMO Rose clay mask',
      ar: 'DEMO ماسك الطين الوردي',
      type: 'homemade',
      amount: 1800,
      stock: 6,
      featured: true,
      palette: 'clay',
    },
    {
      en: 'DEMO Hydrating serum',
      ar: 'DEMO سيروم مرطّب',
      type: 'brand',
      amount: 3500,
      stock: 4,
      featured: true,
      palette: 'sage',
    },
    {
      en: 'DEMO Oat & honey mask',
      ar: 'DEMO ماسك الشوفان والعسل',
      type: 'homemade',
      amount: 1500,
      stock: 3,
      featured: false,
      palette: 'sand',
    },
    {
      en: 'DEMO Lip tint',
      ar: 'DEMO صبغة شفاه',
      type: 'brand',
      amount: 2200,
      stock: 0,
      featured: false,
      palette: 'clay',
    },
    {
      en: 'DEMO Cleansing balm',
      ar: 'DEMO بلسم منظّف',
      type: 'brand',
      amount: 2800,
      stock: 8,
      featured: false,
      palette: 'sand',
    },
    {
      en: 'DEMO Green tea mask',
      ar: 'DEMO ماسك الشاي الأخضر',
      type: 'homemade',
      amount: 1600,
      stock: 5,
      featured: false,
      palette: 'sage',
    },
  ] as const
  for (const p of products) {
    const image = await uploadDemo(
      state,
      p.en.replace('DEMO ', ''),
      p.palette,
      800,
      960,
      p.ar.replace('DEMO ', ''),
    )
    const homemade =
      p.type === 'homemade'
        ? {
            homemade: {
              ingredients: 'DEMO ingredients',
              madeOn: inDays(-2),
              expiresOn: inDays(28),
              storageInstructions: 'DEMO storage instructions',
              usageInstructions: 'DEMO usage instructions',
              patchTestNote: 'DEMO patch-test note',
            },
          }
        : { brand: 'DEMO Brand' }
    const doc = await payload.create({
      collection: 'products',
      locale: 'en',
      data: {
        name: p.en,
        type: p.type,
        category: category.id,
        price: money(p.amount),
        images: [image],
        active: true,
        featuredOnHome: p.featured,
        stockAdjustment: p.stock,
        ...homemade,
      } as never,
    })
    await payload.update({
      collection: 'products',
      id: doc.id,
      locale: 'ar',
      data: {
        name: p.ar,
        ...(p.type === 'homemade'
          ? {
              homemade: {
                ingredients: 'DEMO المكونات',
                storageInstructions: 'DEMO طريقة الحفظ',
                usageInstructions: 'DEMO طريقة الاستعمال',
                patchTestNote: 'DEMO ملاحظة اختبار الحساسية',
              },
            }
          : {}),
      } as never,
    })
    state.created.products.push(doc.id)
    save(state)
  }

  // Reviews
  for (const i of [1, 2, 3]) {
    const doc = await payload.create({
      collection: 'testimonials',
      locale: 'en',
      data: {
        clientName: `DEMO client ${i}`,
        quote: `DEMO review ${i}. Placeholder text, not a real client: it shows how a review will look here.`,
        context: 'DEMO',
        rating: 5,
        published: true,
        sortOrder: i,
        service: serviceIds[i - 1],
      },
    })
    await payload.update({
      collection: 'testimonials',
      id: doc.id,
      locale: 'ar',
      data: {
        clientName: `DEMO عميلة ${i}`,
        quote: `DEMO رأي ${i}. نص مؤقت وليس رأياً حقيقياً: يوضّح شكل الآراء هنا.`,
        context: 'DEMO',
      },
    })
    state.created.testimonials.push(doc.id)
    save(state)
  }

  // Before/after pairs: plain gradients labelled Before / After, never fake results.
  for (const [i, pair] of [
    { en: 'DEMO Bridal pair', ar: 'DEMO زوج عروس', category: 'makeup' },
    { en: 'DEMO Skin pair', ar: 'DEMO زوج بشرة', category: 'skincare' },
  ].entries()) {
    const before = await uploadDemo(state, `Before ${i + 1}`, 'sand', 800, 980, `قبل ${i + 1}`)
    const after = await uploadDemo(state, `After ${i + 1}`, 'clay', 800, 980, `بعد ${i + 1}`)
    const doc = await payload.create({
      collection: 'gallery',
      locale: 'en',
      data: {
        title: pair.en,
        category: pair.category as 'makeup' | 'skincare',
        beforeImage: before,
        afterImage: after,
        featured: true,
        service: serviceIds[i === 0 ? 0 : 3],
      },
    })
    await payload.update({
      collection: 'gallery',
      id: doc.id,
      locale: 'ar',
      data: { title: pair.ar },
    })
    state.created.gallery.push(doc.id)
    save(state)
  }

  const counts = Object.entries(state.created)
    .map(([k, v]) => `${k}=${v.length}`)
    .join(' ')
  console.log(`Demo content seeded: ${counts}, plus site settings and home photos.`)
}

// ── Clear ─────────────────────────────────────────────────────────────────
const restoreGlobal = async <T extends object>(
  p: Payload,
  slug: 'site-settings' | 'home',
  table: string,
  snap: GlobalSnapshot<T>,
) => {
  if (!snap.existed || !snap.en || !snap.ar) {
    // It had never been saved: remove the row the demo created (child tables cascade).
    await db.execute(sql.raw(`DELETE FROM ${table}`))
    return
  }
  await p.updateGlobal({ slug, locale: 'en', data: editable(snap.en) as never })
  await p.updateGlobal({ slug, locale: 'ar', data: editable(snap.ar) as never })
}

const clear = async () => {
  if (!existsSync(STATE_FILE)) throw new Error(`Nothing to clear: ${STATE_FILE} not found.`)
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as State

  // Globals first (they point at demo photos), then collections, photos last.
  await restoreGlobal(payload, 'home', 'home', state.home)
  await restoreGlobal(payload, 'site-settings', 'site_settings', state.siteSettings)
  const order = ['gallery', 'testimonials', 'products', 'categories', 'services', 'media'] as const
  for (const collection of order) {
    for (const id of state.created[collection]) {
      await payload.delete({ collection, id }).catch(() => undefined) // already gone is fine
    }
  }
  rmSync(STATE_FILE)

  const leftovers = await Promise.all(
    order.map(
      async (c) =>
        `${c}=${(await payload.count({ collection: c, where: { id: { in: state.created[c] } } })).totalDocs}`,
    ),
  )
  console.log(`Demo content removed. Demo records left: ${leftovers.join(' ')}`)
}

if (mode === 'seed') await seed()
else if (mode === 'clear') await clear()
else throw new Error('Use "seed" or "clear".')
process.exit(0)
