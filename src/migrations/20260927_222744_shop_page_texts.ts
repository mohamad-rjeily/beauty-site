import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_locales" ADD COLUMN "shop_accent" varchar;
  ALTER TABLE "pages_locales" ADD COLUMN "shop_title" varchar;
  ALTER TABLE "pages_locales" ADD COLUMN "shop_intro" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_locales" DROP COLUMN "shop_accent";
  ALTER TABLE "pages_locales" DROP COLUMN "shop_title";
  ALTER TABLE "pages_locales" DROP COLUMN "shop_intro";`)
}
