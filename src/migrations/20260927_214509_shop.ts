import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase 5 shop: brand product size + how to use, order number, checkout id, order language,
 * structured delivery address, customer notes, delivery fee (order snapshot + Site settings).
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_locale" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum_orders_delivery_fee_currency" AS ENUM('USD');
  CREATE TYPE "public"."enum_site_settings_shop_delivery_fee_currency" AS ENUM('USD');
  ALTER TABLE "products" ADD COLUMN "size" varchar;
  ALTER TABLE "products_locales" ADD COLUMN "how_to_use" varchar;
  ALTER TABLE "orders" ADD COLUMN "order_number" varchar;
  ALTER TABLE "orders" ADD COLUMN "checkout_id" varchar;
  ALTER TABLE "orders" ADD COLUMN "locale" "enum_orders_locale";
  ALTER TABLE "orders" ADD COLUMN "street" varchar;
  ALTER TABLE "orders" ADD COLUMN "building" varchar;
  ALTER TABLE "orders" ADD COLUMN "floor" varchar;
  ALTER TABLE "orders" ADD COLUMN "landmark" varchar;
  ALTER TABLE "orders" ADD COLUMN "notes" varchar;
  ALTER TABLE "orders" ADD COLUMN "delivery_fee_amount" numeric;
  ALTER TABLE "orders" ADD COLUMN "delivery_fee_currency" "enum_orders_delivery_fee_currency" DEFAULT 'USD';
  ALTER TABLE "site_settings" ADD COLUMN "shop_delivery_fee_amount" numeric;
  ALTER TABLE "site_settings" ADD COLUMN "shop_delivery_fee_currency" "enum_site_settings_shop_delivery_fee_currency" DEFAULT 'USD' NOT NULL;
  CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");
  CREATE UNIQUE INDEX "orders_checkout_id_idx" ON "orders" USING btree ("checkout_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "orders_order_number_idx";
  DROP INDEX "orders_checkout_id_idx";
  ALTER TABLE "products" DROP COLUMN "size";
  ALTER TABLE "products_locales" DROP COLUMN "how_to_use";
  ALTER TABLE "orders" DROP COLUMN "order_number";
  ALTER TABLE "orders" DROP COLUMN "checkout_id";
  ALTER TABLE "orders" DROP COLUMN "locale";
  ALTER TABLE "orders" DROP COLUMN "street";
  ALTER TABLE "orders" DROP COLUMN "building";
  ALTER TABLE "orders" DROP COLUMN "floor";
  ALTER TABLE "orders" DROP COLUMN "landmark";
  ALTER TABLE "orders" DROP COLUMN "notes";
  ALTER TABLE "orders" DROP COLUMN "delivery_fee_amount";
  ALTER TABLE "orders" DROP COLUMN "delivery_fee_currency";
  ALTER TABLE "site_settings" DROP COLUMN "shop_delivery_fee_amount";
  ALTER TABLE "site_settings" DROP COLUMN "shop_delivery_fee_currency";
  DROP TYPE "public"."enum_orders_locale";
  DROP TYPE "public"."enum_orders_delivery_fee_currency";
  DROP TYPE "public"."enum_site_settings_shop_delivery_fee_currency";`)
}
