/**
 * Phone rules without any library, safe for browser code (the booking form's quick check).
 * The server re-checks every number with `phoneSchema` (src/lib/phone.ts), built on these,
 * and the admin's phone fields (src/fields/phone.ts) use the same function.
 */

/** E.164: a plus sign, a country code that does not start with 0, 8 to 15 digits in total. */
export const E164 = /^\+[1-9]\d{7,14}$/
/**
 * Lebanese numbers after +961: 7 digits (03 mobiles, 01 and 04-09 landlines) or 8 digits
 * starting with 7 or 8 (newer mobiles). Exact prefixes aren't checked: Lebanon keeps adding them.
 */
const LEBANESE_LOCAL = /^(?:[1-9]\d{6}|[78]\d{7})$/

/** Eastern Arabic (٠-٩) and Persian (۰-۹) digits -> 0-9. */
const westernDigits = (value: string): string =>
  value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))

/**
 * Tidies a typed number into E.164, or returns null when it can't be one.
 * - "00" at the start means "+"; spaces, dashes, dots and brackets are ignored.
 * - With "+": an international number, kept as typed (a +961 one must still be Lebanese).
 * - Without "+": a Lebanese number ("03 123 456", "71 123 456"); one leading 0 is dropped.
 */
export const toE164 = (input: string): string | null => {
  let phone = westernDigits(input.trim()).replace(/[\s\-().]/g, '')
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`

  if (phone.startsWith('+')) {
    if (!E164.test(phone)) return null
    if (phone.startsWith('+961') && !LEBANESE_LOCAL.test(phone.slice(4))) return null
    return phone
  }
  const local = phone.startsWith('0') ? phone.slice(1) : phone
  return LEBANESE_LOCAL.test(local) ? `+961${local}` : null
}

/**
 * The stored form of a typed number: E.164 when valid, otherwise the tidied input (so the
 * validator still sees, and refuses, what was typed).
 */
export const normalizePhone = (input: string): string =>
  toE164(input) ?? westernDigits(input.trim()).replace(/[\s\-().]/g, '')

export const isValidPhone = (value: string): boolean => toE164(value) !== null
