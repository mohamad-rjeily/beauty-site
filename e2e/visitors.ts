/**
 * Fake visitor IPs for the tests, from the ranges reserved for documentation
 * (TEST-NET-2 and TEST-NET-3, RFC 5737): they can never be a real customer.
 *
 * The booking actions rate-limit by the first `x-forwarded-for` address, and `next dev` keeps
 * a header the browser sends. Each browser context gets its own address, so the suite doesn't
 * trip the 5-bookings-per-10-minutes limit; only the spam test sets out to hit it.
 * scripts/e2e-db.ts deletes the rate-limit rows of every address in this list.
 */
export const TEST_VISITOR_IPS: string[] = [
  ...Array.from({ length: 254 }, (_, i) => `198.51.100.${i + 1}`),
  ...Array.from({ length: 254 }, (_, i) => `203.0.113.${i + 1}`),
]

/** Test names start with this, so the clean-up can find every record the tests made. */
export const TEST_PREFIX = 'E2E-TEST'

/** Temporary admin accounts made for a run: e2e-admin-<random>@example.test */
export const ADMIN_EMAIL_PREFIX = 'e2e-admin-'
export const ADMIN_EMAIL_DOMAIN = '@example.test'
