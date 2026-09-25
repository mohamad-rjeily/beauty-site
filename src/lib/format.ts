import { intlLocale, type Locale } from '@/i18n/config'

/** Integer cents -> "$25" or "$25.50" in the page's language. */
export const formatPrice = (cents: number, currency: string, locale: Locale): string => {
  const whole = cents % 100 === 0
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

/** "+9613123456" -> "+961 3 123 456" for display; links always use the raw number. */
export const formatPhone = (e164: string): string => {
  const lebanon = e164.match(/^\+961(\d{1,2})(\d{3})(\d{3})$/)
  if (lebanon) return `+961 ${lebanon[1]} ${lebanon[2]} ${lebanon[3]}`
  return e164
}
