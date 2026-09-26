/**
 * Phone rules without any library, safe for browser code (the booking form's quick check).
 * The server re-checks every number with `phoneSchema` (src/lib/phone.ts), built on these.
 */

/** E.164: a plus sign, a country code that does not start with 0, then up to 15 digits in total. */
export const E164 = /^\+[1-9]\d{7,14}$/
/** Lebanese numbers: +961 followed by 7 digits (e.g. 3 123 456) or 8 digits (e.g. 71 123 456). */
export const LEBANON = /^\+961\d{7,8}$/

/**
 * Removes spaces, dashes, dots and brackets, and turns a leading "00" into "+".
 * It does NOT guess a country code for local numbers: "03 123 456" stays invalid,
 * so nobody's number is silently rewritten into the wrong one.
 */
export const normalizePhone = (input: string): string => {
  const compact = input.trim().replace(/[\s\-().]/g, '')
  return compact.startsWith('00') ? `+${compact.slice(2)}` : compact
}

export const isValidPhone = (value: string): boolean => {
  const phone = normalizePhone(value)
  return E164.test(phone) && (!phone.startsWith('+961') || LEBANON.test(phone))
}
