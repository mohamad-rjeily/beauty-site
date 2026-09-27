/**
 * Integer cents -> "$80", "$12.50", "$1,250": the same in English and Arabic (Western digits,
 * "$" before the number, decimals only when needed), as on price tags in Lebanon. Plain text
 * with no direction marks: in Arabic page text, wrap it in <Ltr> (components/ui/Ltr.tsx).
 */
export const formatPrice = (cents: number, currency: string): string => {
  const whole = cents % 100 === 0
  const amount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
  return currency === 'USD' ? `$${amount}` : `${amount} ${currency}`
}

/** "+9613123456" -> "+961 3 123 456" for display; links always use the raw number. */
export const formatPhone = (e164: string): string => {
  const lebanon = e164.match(/^\+961(\d{1,2})(\d{3})(\d{3})$/)
  if (lebanon) return `+961 ${lebanon[1]} ${lebanon[2]} ${lebanon[3]}`
  return e164
}
