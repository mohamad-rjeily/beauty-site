export const locales = ['en', 'ar'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

/** Cookie that remembers the visitor's language choice (set by the proxy). */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value)

export const direction = (locale: Locale): 'ltr' | 'rtl' => (locale === 'ar' ? 'rtl' : 'ltr')

/**
 * Number and currency formatting. Arabic keeps Western digits (…-u-nu-latn), which is what
 * people in Lebanon read on price tags and phone numbers.
 */
export const intlLocale = (locale: Locale): string =>
  locale === 'ar' ? 'ar-LB-u-nu-latn' : 'en-US'
