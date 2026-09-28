import { intlLocale } from '@/i18n/config'
import { BUSINESS_TIME_ZONE } from '@/lib/time'
import type { Order } from '@/payload-types'

/** Admin language of the current user: the admin only has English and Arabic. */
export type AdminLang = 'en' | 'ar'
export const adminLang = (language: string | undefined): AdminLang =>
  language === 'ar' ? 'ar' : 'en'

type Status = Order['status']

const STATUS_LABELS: Record<Status, Record<AdminLang, string>> = {
  new: { en: 'New', ar: 'جديد' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' },
  cancelled: { en: 'Cancelled', ar: 'ملغى' },
}

export const statusLabel = (status: Status, lang: AdminLang): string =>
  STATUS_LABELS[status]?.[lang] ?? status

/** "28 Sep, 12:40" on the Beirut clock (the year only when it isn't this year's). */
export const formatOrderDate = (iso: string, lang: AdminLang): string => {
  const date = new Date(iso)
  const sameYear =
    new Intl.DateTimeFormat('en', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric' }).format(
      date,
    ) ===
    new Intl.DateTimeFormat('en', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric' }).format(
      new Date(),
    )
  return new Intl.DateTimeFormat(intlLocale(lang), {
    timeZone: BUSINESS_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}
