import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Hand-written: the `rate_limits` table used by the public booking form (src/lib/rateLimit.ts).
 * It is not a Payload collection: nobody edits it, and the admin never shows it. Payload's
 * schema diff ignores tables it doesn't manage, and `push` is off, so it is never dropped.
 * One row per bucket + hashed visitor key (never a raw IP address) with a fixed window.
 * The snapshot (.json) is unchanged from the previous migration for the same reason.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "rate_limits" (
      "key" varchar PRIMARY KEY NOT NULL,
      "window_start" timestamp with time zone NOT NULL,
      "hits" integer NOT NULL
    );
    CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits" USING btree ("window_start");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "rate_limits";
  `)
}
