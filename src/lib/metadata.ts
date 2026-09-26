import type { Metadata } from 'next'

import { getDictionary } from '@/i18n'
import { isLocale } from '@/i18n/config'
import { getSiteChrome } from '@/lib/cms/site'
import type { PageKey } from '@/lib/links'

/** "Services · [BRAND_NAME]", with the other language's address as an alternate. */
export const pageMetadata =
  (page: Exclude<PageKey, 'shop'>) =>
  async ({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> => {
    const { lang } = await params
    if (!isLocale(lang)) return {}
    const { settings } = await getSiteChrome(lang)
    return {
      title: `${getDictionary(lang).nav[page]} · ${settings.brandName}`,
      alternates: { languages: { en: `/en/${page}`, ar: `/ar/${page}` } },
    }
  }
