import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { phoneField } from '@/fields/phone'
import { t } from '@/lib/i18n'

export const BRAND_NAME_PLACEHOLDER = '[BRAND_NAME]'
export const OWNER_NAME_PLACEHOLDER = '[FIRST_NAME]'

/** The single source for the brand name and contact details used across the site. */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: t('Site settings', 'إعدادات الموقع'),
  admin: { group: t('Settings', 'الإعدادات') },
  access: {
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'brandName',
      type: 'text',
      label: t('Brand name', 'اسم العلامة'),
      required: true,
      localized: true,
      defaultValue: BRAND_NAME_PLACEHOLDER,
    },
    {
      // Used in customer-facing lines such as "…so Maya can confirm faster".
      name: 'ownerFirstName',
      type: 'text',
      label: t('Your first name', 'اسمك الأول'),
      localized: true,
      defaultValue: OWNER_NAME_PLACEHOLDER,
      admin: {
        description: t(
          'Shown to customers after they book, e.g. "so Maya can confirm faster".',
          'يظهر للعميلات بعد الحجز، مثال: "لتتمكن مايا من التأكيد بسرعة".',
        ),
      },
    },
    phoneField({ name: 'whatsappNumber', label: t('WhatsApp number', 'رقم واتساب') }),
    {
      name: 'instagramUrl',
      type: 'text',
      label: t('Instagram link', 'رابط إنستغرام'),
      admin: { placeholder: 'https://www.instagram.com/...' },
      validate: (value: string | null | undefined) =>
        !value ||
        /^https:\/\/(www\.)?instagram\.com\/.+/.test(value) ||
        'Use a full https://instagram.com/... link.',
    },
    {
      name: 'locationText',
      type: 'textarea',
      label: t('Address / location', 'العنوان / الموقع'),
      localized: true,
    },
    {
      name: 'mapLink',
      type: 'text',
      label: t('Map link', 'رابط الخريطة'),
      admin: { placeholder: 'https://maps.app.goo.gl/...' },
      validate: (value: string | null | undefined) =>
        !value || /^https:\/\/\S+$/.test(value) || 'Use a full https:// link.',
    },
    {
      name: 'announcementBar',
      type: 'group',
      label: t('Announcement bar', 'شريط الإعلانات'),
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: t('Show the bar', 'إظهار الشريط'),
          defaultValue: false,
        },
        {
          name: 'text',
          type: 'text',
          label: t('Text', 'النص'),
          localized: true,
          admin: { condition: (_, siblingData) => Boolean(siblingData?.enabled) },
        },
        {
          name: 'link',
          type: 'text',
          label: t('Link (optional)', 'رابط (اختياري)'),
          admin: { condition: (_, siblingData) => Boolean(siblingData?.enabled) },
        },
      ],
    },
  ],
}
