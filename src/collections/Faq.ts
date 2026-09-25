import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrAuthenticated } from '@/access'
import { t } from '@/lib/i18n'

export const Faq: CollectionConfig = {
  slug: 'faq',
  labels: { singular: t('Question', 'سؤال'), plural: t('FAQ', 'الأسئلة الشائعة') },
  admin: {
    useAsTitle: 'question',
    group: t('Content', 'المحتوى'),
    defaultColumns: ['question', 'published', 'sortOrder'],
  },
  defaultSort: 'sortOrder',
  access: {
    read: publishedOrAuthenticated('published'),
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'question',
      type: 'text',
      label: t('Question', 'السؤال'),
      required: true,
      localized: true,
    },
    {
      name: 'answer',
      type: 'textarea',
      label: t('Answer', 'الجواب'),
      required: true,
      localized: true,
    },
    {
      name: 'published',
      type: 'checkbox',
      label: t('Shown on the website', 'ظاهر على الموقع'),
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: t('Sort order', 'الترتيب'),
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
  ],
}
