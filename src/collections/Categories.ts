import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { slugField } from '@/fields/slug'
import { t } from '@/lib/i18n'

/** Product categories for the shop. */
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: t('Product category', 'فئة منتجات'),
    plural: t('Product categories', 'فئات المنتجات'),
  },
  admin: {
    useAsTitle: 'name',
    group: t('Shop', 'المتجر'),
    defaultColumns: ['name', 'slug'],
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', label: t('Name', 'الاسم'), required: true, localized: true },
    slugField('name'),
  ],
}
