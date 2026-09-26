import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { format, type Dictionary } from '@/i18n'
import { defaultLocale, type Locale } from '@/i18n/config'
import { formatPrice } from '@/lib/format'
import { inBusinessZone, WEEKDAYS, type Weekday } from '@/lib/time'
import type { Availability, Gallery, Service } from '@/payload-types'

import { toPhoto, type Photo } from './home'

const common = (locale: Locale) =>
  ({ locale, fallbackLocale: defaultLocale, overrideAccess: false }) as const

// ── Rich text ───────────────────────────────────────────────────────────────

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }

/**
 * The plain paragraphs of a Lexical rich-text value (service descriptions). The site shows
 * descriptions as simple paragraphs, so formatting is not carried over.
 */
export const richTextParagraphs = (value: unknown): string[] => {
  const root = (value as { root?: LexicalNode } | null | undefined)?.root
  if (!root?.children) return []
  const text = (node: LexicalNode): string =>
    node.type === 'linebreak' ? '\n' : (node.text ?? '') + (node.children ?? []).map(text).join('')
  return root.children.map((block) => text(block).trim()).filter(Boolean)
}

// ── Services ────────────────────────────────────────────────────────────────

export type ServiceItem = {
  id: number
  name: string
  category: 'makeup' | 'skincare'
  mode: 'slot' | 'request'
  description: string[]
  price: string
  duration: number
  photo: Photo | null
}

/** 45 -> "45 min", 120 -> "2 h", 90 -> "1 h 30 min". */
export const formatDuration = (minutes: number, t: Dictionary): string => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return format(t.minutes, { m })
  return m ? format(t.hoursMinutes, { h, m }) : format(t.hoursOnly, { h })
}

const toServiceItem = (s: Service, locale: Locale): ServiceItem => ({
  id: s.id,
  name: s.name,
  category: s.category,
  mode: s.bookingMode,
  description: richTextParagraphs(s.description),
  price: formatPrice(s.price.amount, s.price.currency, locale),
  duration: s.duration,
  photo: toPhoto(s.images?.[0]),
})

/** Every active service (public rules: inactive ones never leave the database). */
export const getServicesPage = async (locale: Locale) => {
  const payload = await getPayload({ config })
  const [pages, settings, services] = await Promise.all([
    payload.findGlobal({ slug: 'pages', depth: 1, ...common(locale) }),
    payload.findGlobal({ slug: 'site-settings', depth: 0, ...common(locale) }),
    payload.find({
      collection: 'services',
      where: { active: { equals: true } },
      sort: 'sortOrder',
      depth: 1,
      limit: 200,
      ...common(locale),
    }),
  ])
  return {
    page: pages.services,
    settings,
    photos: {
      makeup: toPhoto(pages.services?.makeupPhoto),
      skincare: toPhoto(pages.services?.skincarePhoto),
    },
    services: services.docs.map((s) => toServiceItem(s, locale)),
  }
}

// ── Gallery ─────────────────────────────────────────────────────────────────

export type GalleryStyle = NonNullable<Gallery['style']>

export type GalleryItem = {
  id: number
  title: string
  style: GalleryStyle | null
  category: 'makeup' | 'skincare'
  before: Photo | null
  after: Photo | null
}

const toGalleryItem = (g: Gallery): GalleryItem => ({
  id: g.id,
  title: g.title,
  style: g.style ?? null,
  category: g.category,
  before: toPhoto(g.beforeImage),
  after: toPhoto(g.afterImage),
})

export const getGalleryPage = async (locale: Locale) => {
  const payload = await getPayload({ config })
  const [pages, settings, gallery] = await Promise.all([
    payload.findGlobal({ slug: 'pages', depth: 0, ...common(locale) }),
    payload.findGlobal({ slug: 'site-settings', depth: 0, ...common(locale) }),
    payload.find({
      collection: 'gallery',
      sort: '-createdAt',
      depth: 1,
      limit: 200,
      ...common(locale),
    }),
  ])
  return { page: pages.gallery, settings, items: gallery.docs.map(toGalleryItem) }
}

// ── About ───────────────────────────────────────────────────────────────────

export const getAboutPage = async (locale: Locale) => {
  const payload = await getPayload({ config })
  const [about, settings] = await Promise.all([
    payload.findGlobal({ slug: 'about', depth: 1, ...common(locale) }),
    payload.findGlobal({ slug: 'site-settings', depth: 0, ...common(locale) }),
  ])
  return {
    about,
    settings,
    portrait: toPhoto(about.portrait),
    hands: toPhoto(about.handsPhoto),
    story: [0, 1].map((i) => toPhoto(about.storyPhotos?.[i])),
  }
}

// ── Contact ─────────────────────────────────────────────────────────────────

/** Mon–Sun, the order people read a week in Lebanon. */
const WEEK: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export type DayHours = { day: Weekday; ranges: string[]; today: boolean }

/** One row per weekday, closed days included; today (in Beirut) is marked. */
export const weekHours = (availability: Availability, now = new Date()): DayHours[] => {
  const today = WEEKDAYS[inBusinessZone(now).getDay()]
  return WEEK.map((day) => ({
    day,
    today: day === today,
    ranges: (availability.weeklyHours ?? [])
      .filter((r) => r.day === day)
      .map((r) => `${r.opens}–${r.closes}`)
      .sort(),
  }))
}

export type FaqItem = { id: number; question: string; answer: string }

export const getContactPage = async (locale: Locale) => {
  const payload = await getPayload({ config })
  const [pages, settings, availability, faq] = await Promise.all([
    payload.findGlobal({ slug: 'pages', depth: 1, ...common(locale) }),
    payload.findGlobal({ slug: 'site-settings', depth: 0, ...common(locale) }),
    payload.findGlobal({ slug: 'availability', depth: 0, ...common(locale) }),
    payload.find({
      collection: 'faq',
      where: { published: { equals: true } },
      sort: 'sortOrder',
      depth: 0,
      limit: 100,
      ...common(locale),
    }),
  ])
  return {
    page: pages.contact,
    settings,
    map: toPhoto(pages.contact?.mapPhoto),
    // "Today" is computed when the page is rendered; it is regenerated at least once a minute.
    hours: weekHours(availability),
    faq: faq.docs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
  }
}
