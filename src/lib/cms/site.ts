import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { defaultLocale, type Locale } from '@/i18n/config'

/** Settings shared by every public page (header, footer, WhatsApp). Cached per request. */
export const getSiteChrome = cache(async (locale: Locale) => {
  const payload = await getPayload({ config })
  const common = { locale, fallbackLocale: defaultLocale, overrideAccess: false, depth: 0 } as const
  const [settings, home] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings', ...common }),
    payload.findGlobal({ slug: 'home', ...common }),
  ])
  return { settings, home }
})
