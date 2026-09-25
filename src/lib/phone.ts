import { z } from 'zod'

/** E.164: a plus sign, a country code that does not start with 0, then up to 15 digits in total. */
const E164 = /^\+[1-9]\d{7,14}$/
/** Lebanese numbers: +961 followed by 7 digits (e.g. 3 123 456) or 8 digits (e.g. 71 123 456). */
const LEBANON = /^\+961\d{7,8}$/

/**
 * Removes spaces, dashes, dots and brackets, and turns a leading "00" into "+".
 * It does NOT guess a country code for local numbers: "03 123 456" stays invalid,
 * so nobody's number is silently rewritten into the wrong one.
 */
export const normalizePhone = (input: string): string => {
  const compact = input.trim().replace(/[\s\-().]/g, '')
  return compact.startsWith('00') ? `+${compact.slice(2)}` : compact
}

/** Zod schema reused by the admin fields now and by the booking/checkout forms later. */
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

export const isValidPhone = (value: string): boolean => phoneSchema.safeParse(value).success
