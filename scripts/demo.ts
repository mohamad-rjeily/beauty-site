/**
 * Demo content for looking at the site before real content exists.
 *   npm run demo:seed    add clearly labelled DEMO content
 *   npm run demo:clear   delete all of it and put the database back exactly as before
 *
 * Every record has "DEMO" in its name. Photos are flat palette gradients labelled DEMO:
 * no faces, no fake results. What was created and the previous state of the globals it
 * touches (site settings, home, about, page texts) are saved in .demo-seed.json
 * (git-ignored); seeding twice is refused.
 */
import config from '@payload-config'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'

import type { About, Home, Page, SiteSetting } from '../src/payload-types'

const STATE_FILE = '.demo-seed.json'

type GlobalSnapshot<T> = { existed: boolean; en?: T; ar?: T }
type Collection =
  'media' | 'services' | 'categories' | 'products' | 'testimonials' | 'gallery' | 'faq'
type GlobalSlug = 'site-settings' | 'home' | 'about' | 'pages'
type State = {
  created: Record<Collection, number[]>
  siteSettings: GlobalSnapshot<SiteSetting>
  home: GlobalSnapshot<Home>
  // Added with the about / page texts demo; older state files don't have them.
  about?: GlobalSnapshot<About>
  pages?: GlobalSnapshot<Page>
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

/** Escapes text for use inside SVG markup ("Oat & honey" would otherwise break the file). */
const xml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const demoImage = async (label: string, palette: Palette, width: number, height: number) => {
  const [from, to] = PALETTES[palette]
  const size = Math.round(width / 11)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="46%" text-anchor="middle" font-family="Georgia, serif" font-size="${size}" fill="#fffcf7" fill-opacity="0.9" letter-spacing="${size / 5}">DEMO</text>
    <text x="50%" y="54%" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(size / 3)}" fill="#fffcf7" fill-opacity="0.85">${xml(label)}</text>
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
const snapshot = async <T>(slug: GlobalSlug, table: string): Promise<GlobalSnapshot<T>> => {
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

/** A one-paragraph Lexical rich-text value (service descriptions). */
const richText = (text: string, direction: 'ltr' | 'rtl' = 'ltr') => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction,
        textFormat: 0,
        children: [
          { type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 },
        ],
      },
    ],
  },
})

type ConfigField = {
  type: string
  name?: string
  localized?: boolean
  defaultValue?: unknown
  fields?: ConfigField[]
  tabs?: ConfigField[]
}

/**
 * The default values of a global's localized fields for one language, shaped like its data
 * (named tabs and groups nest). Payload applies defaults only when a document is created, so
 * a language that was never saved would otherwise fall back to the other one.
 */
const localeDefaults = (fields: ConfigField[], locale: 'en' | 'ar'): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.type === 'tabs') {
      for (const tab of field.tabs ?? []) {
        const inner = localeDefaults(tab.fields ?? [], locale)
        if (tab.name) out[tab.name] = inner
        else Object.assign(out, inner)
      }
    } else if (field.type === 'row' || field.type === 'collapsible') {
      Object.assign(out, localeDefaults(field.fields ?? [], locale))
    } else if (field.type === 'group' && field.name) {
      out[field.name] = localeDefaults(field.fields ?? [], locale)
    } else if (field.name && field.localized && field.defaultValue !== undefined) {
      out[field.name] =
        typeof field.defaultValue === 'function'
          ? (field.defaultValue as (args: { locale: string }) => unknown)({ locale })
          : field.defaultValue
    }
  }
  return out
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Deep merge where empty (null / undefined) values never overwrite a real one. */
const merge = (base: Record<string, unknown>, over: Record<string, unknown>) => {
  const out = { ...base }
  for (const [key, value] of Object.entries(over)) {
    if (value === null || value === undefined) continue
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? merge(out[key], value) : value
  }
  return out
}

/**
 * Writes both languages of a global: that language's defaults, then what is already saved in
 * it (read without falling back to the other language), then the demo values.
 */
const updateBoth = async (
  slug: GlobalSlug,
  shared: Record<string, unknown>,
  byLocale: { en: Record<string, unknown>; ar: Record<string, unknown> },
) => {
  const fields = payload.config.globals.find((g) => g.slug === slug)?.fields ?? []
  for (const locale of ['en', 'ar'] as const) {
    const current = await payload.findGlobal({ slug, locale, fallbackLocale: false, depth: 0 })
    const data = merge(
      merge(localeDefaults(fields as ConfigField[], locale), editable(current)),
      merge(shared, byLocale[locale]),
    )
    await payload.updateGlobal({ slug, locale, data: data as never })
  }
}
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
      faq: [],
    },
    siteSettings: await snapshot<SiteSetting>('site-settings', 'site_settings'),
    home: await snapshot<Home>('home', 'home'),
    about: await snapshot<About>('about', 'about'),
    pages: await snapshot<Page>('pages', 'pages'),
  }
  save(state)

  // Contact details
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'en',
    data: {
      whatsappNumber: '+9613000000',
      instagramUrl: 'https://www.instagram.com/demo.account',
      locationText: 'DEMO street, building, floor\nDEMO area, city',
      mapLink: 'https://maps.google.com/?q=Beirut',
    },
  })
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'ar',
    data: { locationText: 'DEMO الشارع، المبنى، الطابق\nDEMO المنطقة، المدينة' },
  })

  // Home photos. Both languages are written in full, so the Arabic text keeps its own defaults.
  const hero = await uploadDemo(state, 'Hero portrait', 'clay', 1200, 1600, 'الصورة الرئيسية')
  const intro = await uploadDemo(state, 'At work', 'sand', 800, 1170, 'أثناء العمل')
  const studio = [
    await uploadDemo(state, 'Studio entrance', 'sand', 600, 1000, 'مدخل الاستوديو'),
    await uploadDemo(state, 'Treatment room', 'sage', 600, 1400, 'غرفة العلاج'),
    await uploadDemo(state, 'Studio detail', 'clay', 600, 1000, 'تفصيل من الاستوديو'),
  ]
  await updateBoth(
    'home',
    { heroPhoto: hero, introPhoto: intro, studioPhotos: studio },
    { en: {}, ar: {} },
  )

  // Services (bridal and event makeup are "request" services)
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
      en: 'DEMO Event makeup',
      ar: 'DEMO مكياج مناسبات',
      category: 'makeup',
      amount: 15000,
      duration: 120,
      mode: 'request',
      palette: 'sand',
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
        description: richText(
          'DEMO description: placeholder text showing where a short description of what is included will go.',
        ),
      } as never,
    })
    await payload.update({
      collection: 'services',
      id: doc.id,
      locale: 'ar',
      data: {
        name: s.ar,
        description: richText('DEMO وصف: نص مؤقت يوضّح مكان الوصف القصير لما تشمله الخدمة.', 'rtl'),
      } as never,
    })
    state.created.services.push(doc.id)
    serviceIds.push(doc.id)
    save(state)
  }

  // Product categories + eight products (brand and homemade; three featured on home)
  const categories: Record<'skincare' | 'makeup', number> = { skincare: 0, makeup: 0 }
  for (const c of [
    { key: 'skincare', en: 'DEMO Skincare', ar: 'DEMO العناية بالبشرة' },
    { key: 'makeup', en: 'DEMO Makeup', ar: 'DEMO مكياج' },
  ] as const) {
    const doc = await payload.create({
      collection: 'categories',
      locale: 'en',
      data: { name: c.en, slug: `demo-${c.key}` },
    })
    await payload.update({
      collection: 'categories',
      id: doc.id,
      locale: 'ar',
      data: { name: c.ar },
    })
    categories[c.key] = doc.id
    state.created.categories.push(doc.id)
    save(state)
  }

  const today = new Date()
  const inDays = (days: number) => new Date(today.getTime() + days * 86_400_000).toISOString()
  const products = [
    {
      en: 'DEMO Rose clay mask',
      ar: 'DEMO ماسك الطين الوردي',
      type: 'homemade',
      category: 'skincare',
      amount: 1800,
      stock: 6,
      featured: true,
      palette: 'clay',
    },
    {
      en: 'DEMO Hydrating serum',
      ar: 'DEMO سيروم مرطّب',
      type: 'brand',
      category: 'skincare',
      amount: 3500,
      stock: 4,
      featured: true,
      palette: 'sage',
    },
    {
      en: 'DEMO Oat & honey mask',
      ar: 'DEMO ماسك الشوفان والعسل',
      type: 'homemade',
      category: 'skincare',
      amount: 1500,
      stock: 3,
      featured: false,
      palette: 'sand',
    },
    {
      en: 'DEMO Lip tint',
      ar: 'DEMO صبغة شفاه',
      type: 'brand',
      category: 'makeup',
      amount: 2200,
      stock: 0,
      featured: false,
      palette: 'clay',
    },
    {
      en: 'DEMO Cleansing balm',
      ar: 'DEMO بلسم منظّف',
      type: 'brand',
      category: 'skincare',
      amount: 2800,
      stock: 8,
      featured: true,
      palette: 'sand',
    },
    {
      en: 'DEMO Green tea mask',
      ar: 'DEMO ماسك الشاي الأخضر',
      type: 'homemade',
      category: 'skincare',
      amount: 1600,
      stock: 5,
      featured: false,
      palette: 'sage',
    },
    {
      en: 'DEMO Brow gel',
      ar: 'DEMO جل الحواجب',
      type: 'brand',
      category: 'makeup',
      amount: 1900,
      stock: 7,
      featured: false,
      palette: 'sand',
    },
    {
      en: 'DEMO Turmeric glow mask',
      ar: 'DEMO ماسك الكركم للنضارة',
      type: 'homemade',
      category: 'skincare',
      amount: 1700,
      stock: 4,
      featured: false,
      palette: 'clay',
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
        category: categories[p.category],
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

  // Gallery: eight items across all four styles. Three are before/after pairs (plain
  // gradients labelled Before / After, never fake results); the rest are single photos.
  const galleryItems = [
    {
      en: 'DEMO Bridal pair',
      ar: 'DEMO زوج عروس',
      category: 'makeup',
      style: 'bridal',
      pair: true,
      featured: true,
      service: 0,
    },
    {
      en: 'DEMO Skin pair',
      ar: 'DEMO زوج بشرة',
      category: 'skincare',
      style: 'skin',
      pair: true,
      featured: true,
      service: 4,
    },
    {
      en: 'DEMO Soirée pair',
      ar: 'DEMO زوج سهرة',
      category: 'makeup',
      style: 'soiree',
      pair: true,
      featured: false,
      service: 2,
    },
    {
      en: 'DEMO Bridal detail',
      ar: 'DEMO تفصيل عروس',
      category: 'makeup',
      style: 'bridal',
      pair: false,
      featured: false,
      service: 0,
    },
    {
      en: 'DEMO Soirée look',
      ar: 'DEMO إطلالة سهرة',
      category: 'makeup',
      style: 'soiree',
      pair: false,
      featured: false,
      service: 2,
    },
    {
      en: 'DEMO Everyday glow',
      ar: 'DEMO إشراقة يومية',
      category: 'makeup',
      style: 'everyday',
      pair: false,
      featured: false,
      service: 3,
    },
    {
      en: 'DEMO Everyday lesson',
      ar: 'DEMO درس يومي',
      category: 'makeup',
      style: 'everyday',
      pair: false,
      featured: false,
      service: 3,
    },
    {
      en: 'DEMO Skin close-up',
      ar: 'DEMO البشرة عن قرب',
      category: 'skincare',
      style: 'skin',
      pair: false,
      featured: false,
      service: 5,
    },
  ] as const
  const palettes: Palette[] = ['clay', 'sage', 'sand']
  for (const [i, item] of galleryItems.entries()) {
    const label = item.en.replace('DEMO ', '')
    const arLabel = item.ar.replace('DEMO ', '')
    const before = await uploadDemo(
      state,
      item.pair ? `Before: ${label}` : label,
      item.pair ? 'sand' : palettes[i % 3],
      800,
      1070,
      item.pair ? `قبل: ${arLabel}` : arLabel,
    )
    const after = item.pair
      ? await uploadDemo(state, `After: ${label}`, 'clay', 800, 1070, `بعد: ${arLabel}`)
      : undefined
    const doc = await payload.create({
      collection: 'gallery',
      locale: 'en',
      data: {
        title: item.en,
        category: item.category,
        style: item.style,
        beforeImage: before,
        ...(after ? { afterImage: after } : {}),
        featured: item.featured,
        service: serviceIds[item.service],
      },
    })
    await payload.update({
      collection: 'gallery',
      id: doc.id,
      locale: 'ar',
      data: { title: item.ar },
    })
    state.created.gallery.push(doc.id)
    save(state)
  }

  // Page photos: the two service categories and the contact map.
  const makeupPhoto = await uploadDemo(state, 'Makeup detail', 'clay', 600, 850, 'تفصيل مكياج')
  const skincarePhoto = await uploadDemo(state, 'Facial treatment', 'sage', 600, 850, 'جلسة وجه')
  const mapPhoto = await uploadDemo(state, 'Map of the street', 'sand', 1200, 1100, 'خريطة الشارع')
  await updateBoth(
    'pages',
    { services: { makeupPhoto, skincarePhoto }, contact: { mapPhoto } },
    {
      en: { contact: { areaLabel: 'DEMO area, city' } },
      ar: { contact: { areaLabel: 'DEMO المنطقة، المدينة' } },
    },
  )

  // About page: photos, placeholder story, facts and certifications, all marked DEMO.
  const portrait = await uploadDemo(state, 'Portrait', 'clay', 900, 1210, 'الصورة الشخصية')
  const hands = await uploadDemo(state, 'Hands at work', 'sage', 500, 500, 'اليدان أثناء العمل')
  const storyPhotos = [
    await uploadDemo(state, 'The studio', 'sand', 600, 800, 'الاستوديو'),
    await uploadDemo(state, 'Her tools', 'clay', 600, 660, 'أدواتها'),
  ]
  await updateBoth(
    'about',
    { portrait, handsPhoto: hands, storyPhotos },
    {
      en: {
        opening:
          'DEMO opening. Placeholder text for who she is and what she believes about beauty, in two sentences. The real words will be hers.',
        started:
          'DEMO: how she started. Placeholder text for her training, her first clients and the moment this became her work.',
        working:
          'DEMO: how she works today. Placeholder text for what a client can expect in the chair, skin first, then the look.',
        quote: 'DEMO: a line she lives by.',
        closing: 'DEMO closing. Placeholder text for why she does this work.',
        facts: [
          { value: 'DEMO', label: 'Experience' },
          { value: 'DEMO', label: 'Brides' },
          { value: 'DEMO', label: 'Certifications' },
        ],
        certifications: [
          { name: 'DEMO certificate', school: 'DEMO academy', year: '20XX' },
          { name: 'DEMO certificate', school: 'DEMO school', year: '20XX' },
        ],
      },
      ar: {
        opening:
          'DEMO افتتاحية. نص مؤقت عن هويتها ورأيها في الجمال، في جملتين. الكلمات الحقيقية ستكون كلماتها.',
        started:
          'DEMO: كيف بدأت. نص مؤقت عن تدريبها وأولى عميلاتها واللحظة التي أصبح فيها هذا عملها.',
        working:
          'DEMO: كيف تعمل اليوم. نص مؤقت عمّا تتوقعه العميلة على الكرسي، البشرة أولاً ثم الإطلالة.',
        quote: 'DEMO: عبارة تعيش بها.',
        closing: 'DEMO خاتمة. نص مؤقت عن سبب قيامها بهذا العمل.',
      },
    },
  )
  // Array rows keep their ids across languages: the Arabic labels go on the same rows.
  const aboutEn = await payload.findGlobal({ slug: 'about', locale: 'en', depth: 0 })
  const aboutAr = await payload.findGlobal({
    slug: 'about',
    locale: 'ar',
    fallbackLocale: false,
    depth: 0,
  })
  await payload.updateGlobal({
    slug: 'about',
    locale: 'ar',
    data: {
      ...editable(aboutAr),
      facts: (aboutEn.facts ?? []).map((f, i) => ({
        id: f.id,
        value: 'DEMO',
        label: ['خبرة', 'عرائس', 'شهادات'][i],
      })),
      certifications: (aboutEn.certifications ?? []).map((c) => ({
        id: c.id,
        name: 'DEMO شهادة',
        school: 'DEMO أكاديمية',
        year: c.year,
      })),
    } as never,
  })

  // FAQ: six placeholder questions on the topics clients usually ask about.
  const faqs = [
    { en: 'DEMO question about booking ahead?', ar: 'DEMO سؤال عن الحجز المسبق؟' },
    { en: 'DEMO question about bridal trials?', ar: 'DEMO سؤال عن تجربة العروس؟' },
    {
      en: 'DEMO question about coming to the venue?',
      ar: 'DEMO سؤال عن الحضور إلى مكان المناسبة؟',
    },
    { en: 'DEMO question about payment?', ar: 'DEMO سؤال عن الدفع؟' },
    { en: 'DEMO question about product delivery?', ar: 'DEMO سؤال عن توصيل المنتجات؟' },
    { en: 'DEMO question about skin preparation?', ar: 'DEMO سؤال عن تحضير البشرة؟' },
  ]
  for (const [i, f] of faqs.entries()) {
    const doc = await payload.create({
      collection: 'faq',
      locale: 'en',
      data: {
        question: f.en,
        answer:
          'DEMO answer. Placeholder text in two or three short sentences, not a real answer: it shows how answers will look here.',
        published: true,
        sortOrder: i,
      },
    })
    await payload.update({
      collection: 'faq',
      id: doc.id,
      locale: 'ar',
      data: {
        question: f.ar,
        answer: 'DEMO جواب. نص مؤقت في جملتين أو ثلاث، وليس جواباً حقيقياً: يوضّح شكل الأجوبة هنا.',
      },
    })
    state.created.faq.push(doc.id)
    save(state)
  }

  const counts = Object.entries(state.created)
    .map(([k, v]) => `${k}=${v.length}`)
    .join(' ')
  console.log(`Demo content seeded: ${counts}, plus site settings, home, about and page texts.`)
}

// ── Clear ─────────────────────────────────────────────────────────────────
const restoreGlobal = async <T extends object>(
  p: Payload,
  slug: GlobalSlug,
  table: string,
  snap: GlobalSnapshot<T> | undefined,
) => {
  if (!snap) return // state file from before this global was part of the demo
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
  await restoreGlobal(payload, 'about', 'about', state.about)
  await restoreGlobal(payload, 'pages', 'pages', state.pages)
  await restoreGlobal(payload, 'site-settings', 'site_settings', state.siteSettings)
  const order = [
    'faq',
    'gallery',
    'testimonials',
    'products',
    'categories',
    'services',
    'media',
  ] as const
  for (const collection of order) {
    for (const id of state.created[collection] ?? []) {
      await payload.delete({ collection, id }).catch(() => undefined) // already gone is fine
    }
  }
  rmSync(STATE_FILE)

  const leftovers = await Promise.all(
    order.map(
      async (c) =>
        `${c}=${(await payload.count({ collection: c, where: { id: { in: state.created[c] ?? [] } } })).totalDocs}`,
    ),
  )
  console.log(`Demo content removed. Demo records left: ${leftovers.join(' ')}`)
}

if (mode === 'seed') await seed()
else if (mode === 'clear') await clear()
else throw new Error('Use "seed" or "clear".')
process.exit(0)
