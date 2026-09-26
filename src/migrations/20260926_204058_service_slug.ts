import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds services.slug (used by booking links: /en/book?service=bridal-makeup).
 *
 * Edited by hand: existing services get a slug from their English name before the column
 * becomes required, the same way the slug field's hook does it ("Bridal Makeup" ->
 * "bridal-makeup"). A name that gives no slug (Arabic only) becomes "service-<id>", and a
 * duplicate gets "-<id>" added, so the unique index can always be built.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "services" ADD COLUMN "slug" varchar;

    UPDATE "services" s
    SET "slug" = trim(BOTH '-' FROM regexp_replace(lower(l."name"), '[^a-z0-9]+', '-', 'g'))
    FROM "services_locales" l
    WHERE l."_parent_id" = s."id" AND l."_locale" = 'en';

    UPDATE "services" SET "slug" = 'service-' || "id" WHERE "slug" IS NULL OR "slug" = '';

    UPDATE "services" s SET "slug" = s."slug" || '-' || s."id"
    WHERE EXISTS (
      SELECT 1 FROM "services" o WHERE o."slug" = s."slug" AND o."id" < s."id"
    );

    ALTER TABLE "services" ALTER COLUMN "slug" SET NOT NULL;
    CREATE UNIQUE INDEX "services_slug_idx" ON "services" USING btree ("slug");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "services_slug_idx";
    ALTER TABLE "services" DROP COLUMN "slug";
  `)
}
