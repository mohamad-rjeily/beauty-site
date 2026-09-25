import type { PayloadRequest } from 'payload'

/** Locales used for content (Payload localization) and for the admin UI. */
export const LOCALES = ['en', 'ar'] as const
export type AppLocale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: AppLocale = 'en'

/**
 * Bilingual label for the admin panel, e.g. `t('Price', 'السعر')`.
 * Payload picks the entry that matches the admin language the user selected.
 */
export const t = (en: string, ar: string): Record<AppLocale, string> => ({ en, ar })

/** Pick an error message in the admin language of the current request (falls back to English). */
export const msg = (req: Partial<PayloadRequest> | undefined, en: string, ar: string): string =>
  req?.i18n?.language === 'ar' ? ar : en
