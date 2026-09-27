type HeaderReader = { get: (name: string) => string | null }
type Env = { NODE_ENV?: string; TRUSTED_IP_HEADER?: string }

let warned = false

/**
 * The visitor's IP address, for rate limits only (it is hashed before it is stored).
 * Returns null when it can't be known safely; callers then use a site-wide limit instead.
 *
 * - Production: ONLY the header named in TRUSTED_IP_HEADER, which the host sets itself and a
 *   visitor can't forge. Every other header (x-forwarded-for included) can be sent by anyone,
 *   so trusting it would let one person pose as endless visitors, or lock out someone else.
 *   Until the variable is set (phase 6, with the host), this returns null and logs a warning
 *   once.
 * - Development: the first x-forwarded-for address, then x-real-ip. `next dev` passes on what
 *   the browser sends, and the e2e suite gives each test visitor its own address that way
 *   (e2e/visitors.ts); without it every test would share one rate-limit bucket.
 */
export const getClientIp = (
  headers: HeaderReader,
  env: Env = process.env,
  warn: (message: string) => void = console.warn,
): string | null => {
  if (env.NODE_ENV !== 'production') {
    return (
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip')?.trim() ||
      'unknown'
    )
  }

  const name = env.TRUSTED_IP_HEADER?.trim()
  const ip = name ? headers.get(name)?.split(',')[0]?.trim() : undefined
  if (ip) return ip
  if (!warned) {
    warned = true
    warn(
      name
        ? `Rate limits: header "${name}" (TRUSTED_IP_HEADER) is missing from requests; using a site-wide limit.`
        : 'Rate limits: TRUSTED_IP_HEADER is not set; using a site-wide limit until it is.',
    )
  }
  return null
}
