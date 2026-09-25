/**
 * Review captures only: temporarily gives site-settings a TEST WhatsApp number and Instagram
 * link so the Book/WhatsApp elements render, then puts the database back exactly as it was.
 *   npm run payload -- run scripts/review-contact.ts set
 *   npm run payload -- run scripts/review-contact.ts restore
 * The backup lives in .impeccable/review/ (git-ignored review evidence).
 */
import config from '@payload-config'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { getPayload } from 'payload'

type Backup = { rowExisted: boolean; whatsappNumber: string | null; instagramUrl: string | null }

const BACKUP = '.impeccable/review/site-settings.backup.json'
const mode = process.argv.at(-1)
const payload = await getPayload({ config })
const db = (payload.db as unknown as PostgresAdapter).drizzle

if (mode === 'set') {
  if (existsSync(BACKUP)) throw new Error('A backup already exists: run "restore" first.')
  const rows = await db.execute(sql`SELECT whatsapp_number, instagram_url FROM site_settings LIMIT 1`)
  const row = rows.rows[0] as { whatsapp_number: string; instagram_url: string | null } | undefined
  const backup: Backup = {
    rowExisted: Boolean(row),
    whatsappNumber: row?.whatsapp_number ?? null,
    instagramUrl: row?.instagram_url ?? null,
  }
  mkdirSync('.impeccable/review', { recursive: true })
  writeFileSync(BACKUP, JSON.stringify(backup))
  await payload.updateGlobal({
    slug: 'site-settings',
    data: { whatsappNumber: '+9613000000', instagramUrl: 'https://www.instagram.com/test.account' },
  })
  console.log('Test contact details set. Backup:', backup)
} else if (mode === 'restore') {
  const backup = JSON.parse(readFileSync(BACKUP, 'utf8')) as Backup
  if (!backup.rowExisted) {
    // The global had never been saved: remove the row the test created (locales cascade).
    await db.execute(sql`DELETE FROM site_settings_locales`)
    await db.execute(sql`DELETE FROM site_settings`)
  } else {
    await db.execute(
      sql`UPDATE site_settings SET whatsapp_number = ${backup.whatsappNumber}, instagram_url = ${backup.instagramUrl}`,
    )
  }
  rmSync(BACKUP)
  const left = await db.execute(sql`SELECT count(*)::int AS n FROM site_settings`)
  console.log('Restored. site_settings rows now:', (left.rows[0] as { n: number }).n)
} else {
  throw new Error('Use "set" or "restore".')
}
process.exit(0)
