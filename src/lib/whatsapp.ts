/** wa.me link with a pre-filled message. `number` is E.164 (+961...). Safe for browser code. */
export const whatsappHref = (number: string, message: string): string => {
  const base = `https://wa.me/${number.replace(/\D/g, '')}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
