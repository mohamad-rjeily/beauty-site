/**
 * Database side of the end-to-end tests (e2e/). Run with `payload run`:
 *   npm run test:e2e:clean      delete everything the tests created
 *   (setup)                     used by e2e/global-setup.ts: creates the temporary admin
 *
 * clean deletes ONLY:
 * - bookings and orders whose customer name starts with "E2E-TEST" (orders never moved stock
 *   unless a test confirmed them; those tests put the stock back themselves)
 * - admin accounts e2e-admin-*@example.test, with their document edit locks (and any lock
 *   left by an account that no longer exists)
 * - rate-limit rows of the fake test IPs (e2e/visitors.ts)
 * DEMO content and real records are never touched.
 *
 * setup first checks the data the suite needs (an active slot service, an active request
 * service, a WhatsApp number) and stops the run with a clear message when one is missing.
 * It then reads the account's email and password from E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
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
  const deleteTestRecords = async (collection: 'bookings' | 'orders') => {
    const found = await payload.find({
      collection,
      overrideAccess: true,
      depth: 0,
      pagination: false,
      select: { customerName: true },
      where: { customerName: { contains: TEST_PREFIX } },
    })
    const ids = found.docs
      .filter((doc) => doc.customerName?.startsWith(TEST_PREFIX))
      .map((doc) => doc.id)
    if (!ids.length) return 0
    const deleted = await payload.delete({
      collection,
      overrideAccess: true,
      where: { id: { in: ids } },
    })
    return deleted.docs.length
  }
  const bookings = await deleteTestRecords('bookings')
  const orders = await deleteTestRecords('orders')

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
  // Edit locks (Payload locks a document while someone has it open) go first: a lock whose
  // user no longer exists makes that document's admin page crash.
  const locks = await payload.find({
    collection: 'payload-locked-documents',
    overrideAccess: true,
    depth: 0,
    pagination: false,
  })
  const remainingUsers = await payload.find({
    collection: 'users',
    overrideAccess: true,
    depth: 0,
    pagination: false,
    select: {},
    where: { id: { not_in: userIds } },
  })
  const keep = new Set(remainingUsers.docs.map((u) => u.id))
  const lockIds = locks.docs
    .filter((lock) => {
      const user = lock.user?.value
      return !user || !keep.has(typeof user === 'object' ? user.id : user)
    })
    .map((lock) => lock.id)
  if (lockIds.length) {
    await payload.delete({
      collection: 'payload-locked-documents',
      overrideAccess: true,
      where: { id: { in: lockIds } },
    })
  }

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
    `E2E clean-up: ${bookings} booking(s), ${orders} order(s), ${users.docs.length} test admin(s), ${lockIds.length} edit lock(s), ` +
      `${limits.rowCount ?? 0} rate-limit row(s) deleted.`,
  )
}

const setup = async () => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  if (!email?.startsWith(ADMIN_EMAIL_PREFIX) || !email.endsWith(ADMIN_EMAIL_DOMAIN) || !password) {
    throw new Error('E2E setup: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD are missing or invalid.')
  }

  // The suite needs data to test: stop here with a clear message, rather than skipping tests.
  const active = await payload.find({
    collection: 'services',
    where: { active: { equals: true } },
    depth: 0,
    pagination: false,
    select: { bookingMode: true },
  })
  const modes = new Set(active.docs.map((s) => s.bookingMode))
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const missing = [
    !modes.has('slot') && 'No active time-slot service: run npm run demo:seed first.',
    !modes.has('request') && 'No active request service: run npm run demo:seed first.',
    !settings.whatsappNumber &&
      'No WhatsApp number: set a WhatsApp number in Site settings, or run npm run demo:seed first.',
  ].filter(Boolean)
  if (missing.length) throw new Error(`E2E setup stopped.\n${missing.join('\n')}`)

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
