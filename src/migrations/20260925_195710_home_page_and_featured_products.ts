import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "home_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "home_facts_locales" (
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_photo_id" integer,
  	"intro_photo_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_locales" (
  	"headline_line1" varchar,
  	"headline_line2" varchar,
  	"headline_line3" varchar,
  	"tagline" varchar,
  	"intro_greeting" varchar,
  	"intro_text" varchar,
  	"signature" varchar,
  	"services_heading" varchar,
  	"results_heading" varchar,
  	"results_note" varchar,
  	"shop_heading" varchar,
  	"reviews_heading" varchar,
  	"visit_heading" varchar,
  	"footer_signoff" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "home_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  ALTER TABLE "products" ADD COLUMN "featured_on_home" boolean DEFAULT false;
  ALTER TABLE "home_facts" ADD CONSTRAINT "home_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_facts_locales" ADD CONSTRAINT "home_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_hero_photo_id_media_id_fk" FOREIGN KEY ("hero_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_intro_photo_id_media_id_fk" FOREIGN KEY ("intro_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_locales" ADD CONSTRAINT "home_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_rels" ADD CONSTRAINT "home_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_rels" ADD CONSTRAINT "home_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_facts_order_idx" ON "home_facts" USING btree ("_order");
  CREATE INDEX "home_facts_parent_id_idx" ON "home_facts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "home_facts_locales_locale_parent_id_unique" ON "home_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_hero_photo_idx" ON "home" USING btree ("hero_photo_id");
  CREATE INDEX "home_intro_photo_idx" ON "home" USING btree ("intro_photo_id");
  CREATE UNIQUE INDEX "home_locales_locale_parent_id_unique" ON "home_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_rels_order_idx" ON "home_rels" USING btree ("order");
  CREATE INDEX "home_rels_parent_idx" ON "home_rels" USING btree ("parent_id");
  CREATE INDEX "home_rels_path_idx" ON "home_rels" USING btree ("path");
  CREATE INDEX "home_rels_media_id_idx" ON "home_rels" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "home_facts" CASCADE;
  DROP TABLE "home_facts_locales" CASCADE;
  DROP TABLE "home" CASCADE;
  DROP TABLE "home_locales" CASCADE;
  DROP TABLE "home_rels" CASCADE;
  ALTER TABLE "products" DROP COLUMN "featured_on_home";`)
}
