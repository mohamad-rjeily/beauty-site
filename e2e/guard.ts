/**
 * Safety guard for the end-to-end tests. They create and delete records, so they must never
 * run against the live site's database. Called by the Playwright config, the global setup
 * and scripts/e2e-db.ts (so `npm run test:e2e:clean` is guarded too).
 *
 * Refuses when:
 * - NODE_ENV is "production";
 * - DATABASE_URL's host is not the dev database named in E2E_DATABASE_HOST (a local
 *   Postgres, localhost / 127.0.0.1 / ::1, is always accepted).
 *
 * E2E_DATABASE_HOST lives in .env next to DATABASE_URL. It is a host name, not a secret.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export const assertTestDatabase = (): void => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('E2E guard: refusing to run with NODE_ENV=production.')
  }

  const url = process.env.DATABASE_URL
  if (!url) throw new Error('E2E guard: DATABASE_URL is not set.')

  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    throw new Error('E2E guard: DATABASE_URL is not a valid URL.')
  }
  if (LOCAL_HOSTS.has(host)) return

  const allowed = process.env.E2E_DATABASE_HOST?.trim().toLowerCase()
  if (!allowed) {
    throw new Error(
      'E2E guard: set E2E_DATABASE_HOST in .env to the host name of the DEV database ' +
        '(the part after "@" in DATABASE_URL). The tests refuse to run without it.',
    )
  }
  if (host !== allowed) {
    // Never print the URL: it contains the password.
    throw new Error(
      'E2E guard: DATABASE_URL does not point at the dev database (E2E_DATABASE_HOST). ' +
        'Refusing to run: the tests must never touch the live database.',
    )
  }
}
