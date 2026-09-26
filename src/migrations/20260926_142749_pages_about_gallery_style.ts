import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_gallery_style" AS ENUM('bridal', 'soiree', 'everyday', 'skin');
  CREATE TABLE "about_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "about_facts_locales" (
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "about_certifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"year" varchar
  );
  
  CREATE TABLE "about_certifications_locales" (
  	"name" varchar NOT NULL,
  	"school" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "about" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"portrait_id" integer,
  	"hands_photo_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "about_locales" (
  	"accent" varchar,
  	"greeting" varchar,
  	"opening" varchar,
  	"started" varchar,
  	"working" varchar,
  	"quote" varchar,
  	"closing" varchar,
  	"signature" varchar,
  	"cta_heading" varchar,
  	"cta_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "about_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"services_makeup_photo_id" integer,
  	"services_skincare_photo_id" integer,
  	"contact_map_photo_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "pages_locales" (
  	"services_accent" varchar,
  	"services_title" varchar,
  	"services_intro" varchar,
  	"services_makeup_intro" varchar,
  	"services_skincare_intro" varchar,
  	"services_request_heading" varchar,
  	"services_request_note" varchar,
  	"services_ask_line" varchar,
  	"gallery_accent" varchar,
  	"gallery_title" varchar,
  	"gallery_intro" varchar,
  	"gallery_before_after_heading" varchar,
  	"gallery_before_after_note" varchar,
  	"gallery_cta_heading" varchar,
  	"gallery_cta_text" varchar,
  	"contact_accent" varchar,
  	"contact_title" varchar,
  	"contact_area_label" varchar,
  	"contact_hours_heading" varchar,
  	"contact_hours_note" varchar,
  	"contact_faq_heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "gallery" ADD COLUMN "style" "enum_gallery_style";
  ALTER TABLE "about_facts" ADD CONSTRAINT "about_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_facts_locales" ADD CONSTRAINT "about_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_certifications" ADD CONSTRAINT "about_certifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_certifications_locales" ADD CONSTRAINT "about_certifications_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_certifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_hands_photo_id_media_id_fk" FOREIGN KEY ("hands_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_locales" ADD CONSTRAINT "about_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_rels" ADD CONSTRAINT "about_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_rels" ADD CONSTRAINT "about_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_services_makeup_photo_id_media_id_fk" FOREIGN KEY ("services_makeup_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_services_skincare_photo_id_media_id_fk" FOREIGN KEY ("services_skincare_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_contact_map_photo_id_media_id_fk" FOREIGN KEY ("contact_map_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "about_facts_order_idx" ON "about_facts" USING btree ("_order");
  CREATE INDEX "about_facts_parent_id_idx" ON "about_facts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "about_facts_locales_locale_parent_id_unique" ON "about_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_certifications_order_idx" ON "about_certifications" USING btree ("_order");
  CREATE INDEX "about_certifications_parent_id_idx" ON "about_certifications" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "about_certifications_locales_locale_parent_id_unique" ON "about_certifications_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_portrait_idx" ON "about" USING btree ("portrait_id");
  CREATE INDEX "about_hands_photo_idx" ON "about" USING btree ("hands_photo_id");
  CREATE UNIQUE INDEX "about_locales_locale_parent_id_unique" ON "about_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_rels_order_idx" ON "about_rels" USING btree ("order");
  CREATE INDEX "about_rels_parent_idx" ON "about_rels" USING btree ("parent_id");
  CREATE INDEX "about_rels_path_idx" ON "about_rels" USING btree ("path");
  CREATE INDEX "about_rels_media_id_idx" ON "about_rels" USING btree ("media_id");
  CREATE INDEX "pages_services_services_makeup_photo_idx" ON "pages" USING btree ("services_makeup_photo_id");
  CREATE INDEX "pages_services_services_skincare_photo_idx" ON "pages" USING btree ("services_skincare_photo_id");
  CREATE INDEX "pages_contact_contact_map_photo_idx" ON "pages" USING btree ("contact_map_photo_id");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "about_facts" CASCADE;
  DROP TABLE "about_facts_locales" CASCADE;
  DROP TABLE "about_certifications" CASCADE;
  DROP TABLE "about_certifications_locales" CASCADE;
  DROP TABLE "about" CASCADE;
  DROP TABLE "about_locales" CASCADE;
  DROP TABLE "about_rels" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  ALTER TABLE "gallery" DROP COLUMN "style";
  DROP TYPE "public"."enum_gallery_style";`)
}
