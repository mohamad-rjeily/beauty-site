import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { t } from '@/lib/i18n'

/**
 * Photos. Stored on local disk in development (/media, git-ignored);
 * a cloud storage adapter replaces this at deploy time (phase 6).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: t('Photo', 'صورة'), plural: t('Photos', 'الصور') },
  admin: { group: t('Content', 'المحتوى') },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  upload: {
    mimeTypes: ['image/*'],
    focalPoint: true,
    imageSizes: [{ name: 'thumbnail', width: 400, formatOptions: { format: 'webp' } }],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: t('Description (alt text)', 'وصف الصورة'),
      required: true,
      localized: true,
      admin: {
        description: t(
          'What the photo shows, for screen readers and search engines.',
          'ماذا تُظهر الصورة، لقارئات الشاشة ومحركات البحث.',
        ),
      },
    },
  ],
}
