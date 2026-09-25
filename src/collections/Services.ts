import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrAuthenticated } from '@/access'
import { moneyField } from '@/fields/money'
import { t } from '@/lib/i18n'

export const SERVICE_CATEGORIES = [
  { label: t('Makeup', 'مكياج'), value: 'makeup' },
  { label: t('Skincare', 'العناية بالبشرة'), value: 'skincare' },
]

export const Services: CollectionConfig = {
  slug: 'services',
  labels: { singular: t('Service', 'خدمة'), plural: t('Services', 'الخدمات') },
  admin: {
    useAsTitle: 'name',
    group: t('Content', 'المحتوى'),
    defaultColumns: ['name', 'category', 'duration', 'active', 'sortOrder'],
  },
  defaultSort: 'sortOrder',
  access: {
    read: publishedOrAuthenticated('active'),
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', label: t('Name', 'الاسم'), required: true, localized: true },
    {
      name: 'category',
      type: 'select',
      label: t('Category', 'الفئة'),
      required: true,
      options: SERVICE_CATEGORIES,
    },
    { name: 'description', type: 'richText', label: t('Description', 'الوصف'), localized: true },
    moneyField({ name: 'price', label: t('Price', 'السعر') }),
    {
      name: 'duration',
      type: 'number',
      label: t('Duration (minutes)', 'المدة (بالدقائق)'),
      required: true,
      min: 5,
      admin: {
        step: 5,
        description: t(
          'Used to block the calendar when this service is booked.',
          'تُستخدم لحجز الوقت في التقويم عند حجز هذه الخدمة.',
        ),
      },
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      label: t('Photos', 'الصور'),
    },
    {
      name: 'active',
      type: 'checkbox',
      label: t('Shown on the website and bookable', 'ظاهرة على الموقع وقابلة للحجز'),
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: t('Sort order', 'الترتيب'),
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: t('Lower numbers come first.', 'الأرقام الأصغر تظهر أولاً.'),
      },
    },
  ],
}
