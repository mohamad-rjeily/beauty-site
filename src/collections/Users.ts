import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access'
import { t } from '@/lib/i18n'

/**
 * Admin accounts only (the owner and the developer). Customers never get accounts.
 * No public sign-up: only a logged-in admin can create users. The very first
 * account is created through /admin, which Payload allows while no user exists.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: t('Admin user', 'مستخدم الإدارة'),
    plural: t('Admin users', 'مستخدمو الإدارة'),
  },
  admin: {
    useAsTitle: 'email',
    group: t('Settings', 'الإعدادات'),
    defaultColumns: ['name', 'email'],
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    // email and password are added by `auth: true`
    { name: 'name', type: 'text', label: t('Name', 'الاسم') },
  ],
}
