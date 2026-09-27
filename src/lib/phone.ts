import { z } from 'zod'

import { toE164 } from './phoneFormat'

export { isValidPhone, normalizePhone, toE164 } from './phoneFormat'

/**
 * Zod schema used by the public booking form (server side): any accepted spelling in,
 * E.164 out ("03 123 456" -> "+9613123456").
 */
export const phoneSchema = z.string().transform((value, ctx) => {
  const phone = toE164(value)
  if (phone) return phone
  ctx.addIssue({ code: 'custom', message: 'Use a number like 03 123 456, or + and the country code' })
  return z.NEVER
})
