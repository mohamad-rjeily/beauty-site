import type { TextField } from 'payload'

import { msg, t } from '@/lib/i18n'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** "Rose Clay Mask" -> "rose-clay-mask". Arabic-only names produce "" (the owner then types one). */
export const slugify = (input: string): string =>
  input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * URL slug, filled from the English name when left empty. Unique and not localized,
 * so /en/... and /ar/... share one address for the same item.
 */
export const slugField = (from = 'name'): TextField => ({
  name: 'slug',
  type: 'text',
  label: t('URL slug', 'الرابط المختصر'),
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: t(
      'Lowercase letters, numbers and dashes. Filled from the English name if left empty.',
      'أحرف إنجليزية صغيرة وأرقام وشرطات. يُملأ من الاسم الإنجليزي إذا تُرك فارغاً.',
    ),
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (typeof value === 'string' && value.trim() !== '') return slugify(value)
        const source = data?.[from]
        return typeof source === 'string' ? slugify(source) : value
      },
    ],
  },
  validate: (value: string | null | undefined, { req }) => {
    if (!value) {
      return msg(
        req,
        'Enter a slug (the English name fills it automatically).',
        'أدخلي رابطاً مختصراً (يُملأ تلقائياً من الاسم الإنجليزي).',
      )
    }
    return (
      SLUG.test(value) ||
      msg(
        req,
        'Use lowercase letters, numbers and dashes only.',
        'استخدمي أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط.',
      )
    )
  },
})
