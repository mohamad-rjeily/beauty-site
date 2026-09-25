import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrAuthenticated } from '@/access'
import { t } from '@/lib/i18n'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: { singular: t('Review', 'رأي'), plural: t('Reviews', 'آراء العملاء') },
  admin: {
    useAsTitle: 'clientName',
    group: t('Content', 'المحتوى'),
    defaultColumns: ['clientName', 'service', 'published', 'sortOrder'],
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
      name: 'clientName',
      type: 'text',
      label: t('Client name as shown', 'اسم العميلة كما يظهر'),
      required: true,
      localized: true,
      admin: {
        description: t(
          'Only publish with her permission, e.g. "Rana K."',
          'لا يُنشر إلا بإذنها، مثال: "رنا ك."',
        ),
      },
    },
    {
      name: 'quote',
      type: 'textarea',
      label: t('Review', 'الرأي'),
      required: true,
      localized: true,
    },
    {
      name: 'context',
      type: 'text',
      label: t('Occasion (optional)', 'المناسبة (اختياري)'),
      localized: true,
      admin: { placeholder: 'Bride · June 2026' },
    },
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      label: t('Service', 'الخدمة'),
    },
    {
      name: 'rating',
      type: 'number',
      label: t('Stars (1–5, optional)', 'النجوم (1–5، اختياري)'),
      min: 1,
      max: 5,
      admin: { step: 1 },
    },
    {
      name: 'published',
      type: 'checkbox',
      label: t('Shown on the website', 'ظاهر على الموقع'),
      defaultValue: false,
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
