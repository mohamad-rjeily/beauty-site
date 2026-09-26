import { z } from 'zod'

import { E164, LEBANON, normalizePhone } from './phoneFormat'

export { isValidPhone, normalizePhone } from './phoneFormat'

/** Zod schema used by the admin fields and the public booking form (server side). */
export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(
    z
      .string()
      .regex(E164, 'Use international format, e.g. +961 3 123 456')
      .refine((value) => !value.startsWith('+961') || LEBANON.test(value), {
        message: 'A Lebanese number has 7 or 8 digits after +961',
      }),
  )
