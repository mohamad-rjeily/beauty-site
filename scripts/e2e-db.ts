/**
 * Database side of the end-to-end tests (e2e/). Run with `payload run`:
 *   npm run test:e2e:clean      delete everything the tests created
 *   (setup)                     used by e2e/global-setup.ts: creates the temporary admin
 *
 * clean deletes ONLY:
 * - bookings whose customer name starts with "E2E-TEST"
 * - admin accounts e2e-admin-*@example.test
 * - rate-limit rows of the fake test IPs (e2e/visitors.ts)
 * DEMO content and real records are never touched.
 *
 * setup reads the account's email and password from E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 * (generated per run by the global setup) and never prints them.
 */
import config from '@payload-config'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { assertTestDatabase } from '../e2e/guard'
import {
  ADMIN_EMAIL_DOMAIN,
  ADMIN_EMAIL_PREFIX,
  TEST_PREFIX,
  TEST_VISITOR_IPS,
} from '../e2e/visitors'
import { hashVisitorKey } from '../src/lib/rateLimit'

assertTestDatabase()

const command = process.argv.at(-1)
const payload = await getPayload({ config })

const clean = async () => {
  // Payload's `contains` is case-insensitive and matches anywhere: find, keep only names that
  // really START with the prefix, then delete exactly those ids.
  const found = await payload.find({
    collection: 'bookings',
    overrideAccess: true,
    depth: 0,
    pagination: false,
    select: { customerName: true },
    where: { customerName: { contains: TEST_PREFIX } },
  })
  const bookingIds = found.docs
    .filter((b) => b.customerName?.startsWith(TEST_PREFIX))
    .map((b) => b.id)
  const bookings = bookingIds.length
    ? await payload.delete({
        collection: 'bookings',
        overrideAccess: true,
        where: { id: { in: bookingIds } },
      })
    : { docs: [] }

  const accounts = await payload.find({
    collection: 'users',
    overrideAccess: true,
    depth: 0,
    pagination: false,
    where: { email: { contains: ADMIN_EMAIL_PREFIX } },
  })
  const userIds = accounts.docs
    .filter((u) => u.email.startsWith(ADMIN_EMAIL_PREFIX) && u.email.endsWith(ADMIN_EMAIL_DOMAIN))
    .map((u) => u.id)
  const users = userIds.length
    ? await payload.delete({
        collection: 'users',
        overrideAccess: true,
        where: { id: { in: userIds } },
      })
    : { docs: [] }

  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const keys = TEST_VISITOR_IPS.flatMap((ip) => {
    const key = hashVisitorKey(ip)
    return [`book:${key}`, `slots:${key}`]
  })
  const limits = await db.execute(
    sql`DELETE FROM "rate_limits" WHERE "key" IN (${sql.join(
      keys.map((k) => sql`${k}`),
      sql`, `,
    )})`,
  )

  console.log(
    `E2E clean-up: ${bookings.docs.length} booking(s), ${users.docs.length} test admin(s), ` +
      `${limits.rowCount ?? 0} rate-limit row(s) deleted.`,
  )
}

const setup = async () => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  if (!email?.startsWith(ADMIN_EMAIL_PREFIX) || !email.endsWith(ADMIN_EMAIL_DOMAIN) || !password) {
    throw new Error('E2E setup: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD are missing or invalid.')
  }
  await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: { email, password, name: `${TEST_PREFIX} admin` },
  })
  console.log('E2E setup: temporary admin created.')
}

try {
  if (command === 'clean') await clean()
  else if (command === 'setup') await setup()
  else throw new Error('Usage: payload run scripts/e2e-db.ts clean|setup')
  process.exit(0)
} catch (error) {
  console.error((error as Error).message)
  process.exit(1)
}
