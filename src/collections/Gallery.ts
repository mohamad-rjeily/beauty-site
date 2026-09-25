import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { t } from '@/lib/i18n'

import { SERVICE_CATEGORIES } from './Services'

export const Gallery: CollectionConfig = {
  slug: 'gallery',
  labels: { singular: t('Gallery item', 'عنصر في المعرض'), plural: t('Gallery', 'المعرض') },
  admin: {
    useAsTitle: 'title',
    group: t('Content', 'المحتوى'),
    defaultColumns: ['title', 'category', 'service', 'featured'],
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', label: t('Title', 'العنوان'), required: true, localized: true },
    {
      name: 'category',
      type: 'select',
      label: t('Category', 'الفئة'),
      required: true,
      options: SERVICE_CATEGORIES,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'beforeImage',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: t('Before photo (or the only photo)', 'صورة قبل (أو الصورة الوحيدة)'),
        },
        {
          name: 'afterImage',
          type: 'upload',
          relationTo: 'media',
          label: t('After photo (optional)', 'صورة بعد (اختيارية)'),
          admin: {
            description: t(
              'Same light and angle as the before photo.',
              'بنفس الإضاءة والزاوية كصورة قبل.',
            ),
          },
        },
      ],
    },
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      label: t('Service', 'الخدمة'),
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: t('Featured on the home page', 'مميز في الصفحة الرئيسية'),
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
  ],
}
