import type { Field } from 'payload'

import { t } from '@/lib/i18n'

/**
 * Localized text with an English and an Arabic default. Payload's `defaultValue` function
 * receives the locale being edited, so each language starts with its own approved copy.
 */
export const localizedText = (
  name: string,
  label: Record<string, string>,
  defaults: { en: string; ar: string },
  type: 'text' | 'textarea' = 'text',
  description?: Record<string, string>,
): Field => {
  const base = {
    name,
    label,
    localized: true as const,
    defaultValue: ({ locale }: { locale?: string }) =>
      locale === 'ar' ? defaults.ar : defaults.en,
    admin: description ? { description } : undefined,
  }
  return type === 'textarea' ? { ...base, type: 'textarea' } : { ...base, type: 'text' }
}

/** A heading whose starred words are set in italics on the website. */
export const starredHeading = (
  name: string,
  label: Record<string, string>,
  defaults: { en: string; ar: string },
): Field => localizedText(name, label, defaults, 'text', STARS_HINT)

export const STARS_HINT = t(
  'Put *stars* around the word to set in italics, e.g. "Two crafts, one *hand.*"',
  'ضعي *نجمتين* حول الكلمة المميّزة، مثال: "حِرفتان، ويدٌ *واحدة.*"',
)

/** Optional line in the other language, shown small in rose (hidden when empty). */
export const accentLine = (name: string, defaults: { en: string; ar: string }): Field =>
  localizedText(
    name,
    t('Accent line in the other language (optional)', 'سطر مميّز باللغة الأخرى (اختياري)'),
    defaults,
    'text',
    t(
      'Shown small in rose above the title, in the other language. Leave empty to hide.',
      'يظهر صغيراً بلون المريمية فوق العنوان، باللغة الأخرى. اتركيه فارغاً لإخفائه.',
    ),
  )

export const photo = (
  name: string,
  label: Record<string, string>,
  description: Record<string, string>,
): Field => ({
  name,
  type: 'upload',
  relationTo: 'media',
  label,
  admin: { description },
})
