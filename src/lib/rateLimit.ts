import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { createHmac } from 'node:crypto'
import type { Payload } from 'payload'

import { getClientIp } from './clientIp'

/**
 * Turns a visitor identifier (an IP address) into an opaque key, so the database never
 * stores the address itself. Keyed with PAYLOAD_SECRET: the key can't be reversed with a
 * table of all IPv4 addresses.
 */
export const hashVisitorKey = (value: string): string =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || 'rate-limit')
    .update(value)
    .digest('hex')

/**
 * Counts one hit for `key` in `bucket` and says whether it is still within `limit` hits per
 * `windowSeconds` (a fixed window that starts at the first hit).
 *
 * Stored in Postgres (the `rate_limits` table, see migrations) rather than in memory, so it
 * holds across serverless instances. The single upsert is atomic: two requests at the same
 * moment can't both read the old count.
 */
export const consumeRateLimit = async (
  payload: Payload,
  {
    bucket,
    key,
    limit,
    windowSeconds,
  }: { bucket: string; key: string; limit: number; windowSeconds: number },
): Promise<boolean> => {
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const id = `${bucket}:${key}`
  const window = `${windowSeconds} seconds`

  const result = await db.execute(sql`
    INSERT INTO "rate_limits" ("key", "window_start", "hits")
    VALUES (${id}, now(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE
        WHEN "rate_limits"."window_start" <= now() - ${window}::interval THEN 1
        ELSE "rate_limits"."hits" + 1
      END,
      "window_start" = CASE
        WHEN "rate_limits"."window_start" <= now() - ${window}::interval THEN now()
        ELSE "rate_limits"."window_start"
      END
    RETURNING "hits"
  `)
  const hits = Number((result.rows[0] as { hits: number | string }).hits)

  // Housekeeping: now and then, forget visitors not seen for a day.
  if (Math.random() < 0.02) {
    await db.execute(sql`DELETE FROM "rate_limits" WHERE "window_start" < now() - interval '1 day'`)
  }

  return hits <= limit
}

export type Limit = {
  bucket: string
  /** Hits per window for one visitor (by hashed IP). */
  perVisitor: number
  /** Hits per window for the whole site, used while the visitor's IP can't be known safely. */
  siteWide: number
  windowSeconds: number
}

/**
 * One hit for this visitor. When the visitor's IP can't be known safely (production without
 * TRUSTED_IP_HEADER, see lib/clientIp.ts), everyone shares one generous site-wide bucket
 * instead: a safety cap against floods, never a tiny limit that locks out real customers.
 * `headers` are the request headers (Server Actions: `await headers()` from next/headers).
 */
export const withinLimit = async (
  payload: Payload,
  limit: Limit,
  headers: { get: (name: string) => string | null },
): Promise<boolean> => {
  const ip = getClientIp(headers, process.env, (m) => payload.logger.warn(m))
  return consumeRateLimit(payload, {
    windowSeconds: limit.windowSeconds,
    ...(ip
      ? { bucket: limit.bucket, key: hashVisitorKey(ip), limit: limit.perVisitor }
      : { bucket: `${limit.bucket}-site`, key: 'all', limit: limit.siteWide }),
  })
}
