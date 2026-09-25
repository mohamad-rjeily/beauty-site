import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "home_locales" ADD COLUMN "accent_line" varchar;
  ALTER TABLE "home_locales" ADD COLUMN "intro_accent" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "home_locales" DROP COLUMN "accent_line";
  ALTER TABLE "home_locales" DROP COLUMN "intro_accent";`)
}
