import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ar } from '@payloadcms/translations/languages/ar'
import { en } from '@payloadcms/translations/languages/en'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Bookings } from './collections/Bookings'
import { Categories } from './collections/Categories'
import { Faq } from './collections/Faq'
import { Gallery } from './collections/Gallery'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { Products } from './collections/Products'
import { Services } from './collections/Services'
import { Testimonials } from './collections/Testimonials'
import { Users } from './collections/Users'
import { Availability } from './globals/Availability'
import { SiteSettings } from './globals/SiteSettings'
import { DEFAULT_LOCALE } from './lib/i18n'
import { BUSINESS_TIME_ZONE } from './lib/time'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    timezones: {
      supportedTimezones: [{ label: 'Beirut', value: BUSINESS_TIME_ZONE }],
      defaultTimezone: BUSINESS_TIME_ZONE,
    },
  },
  // Admin panel language: each user picks English or Arabic in their account settings.
  i18n: {
    supportedLanguages: { en, ar },
    fallbackLanguage: 'en',
  },
  // Content languages: every customer-facing text field is marked `localized: true`.
  localization: {
    locales: [
      { code: 'en', label: 'English' },
      { code: 'ar', label: 'العربية', rtl: true },
    ],
    defaultLocale: DEFAULT_LOCALE,
    fallback: true,
  },
  collections: [
    Services,
    Gallery,
    Testimonials,
    Faq,
    Media,
    Products,
    Categories,
    Orders,
    Bookings,
    Users,
  ],
  globals: [SiteSettings, Availability],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Schema changes go through migration files only (src/migrations), never automatic
    // "push": push could drop database objects it doesn't manage, such as the
    // no-overlapping-bookings constraint.
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: [],
})
