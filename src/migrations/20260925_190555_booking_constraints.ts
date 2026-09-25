import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Hand-written: database-level guarantees for bookings that Payload's schema can't express.
 *
 * 1. bookings_no_overlap: no two non-cancelled bookings WITH times may overlap on
 *    [start_time, occupied_until), where occupied_until = end + break. The half-open range '[)'
 *    lets back-to-back bookings touch. Request bookings without times (start_time IS NULL)
 *    are ignored: an empty range would otherwise block the whole calendar.
 * 2. bookings_times_consistent: times are all set or all empty, and in order.
 * 3. bookings_slot_has_time: time-slot bookings always have a start time.
 *
 * The range type must match the column type (tstzrange for timestamptz, tsrange for
 * timestamp). The columns are checked first, so a mismatch stops the migration loudly
 * instead of building a constraint that compares the wrong thing.
 */
const EXPECTED_TYPE = 'timestamp with time zone'
const TIME_COLUMNS = ['start_time', 'end_time', 'occupied_until']

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const columns = await db.execute(sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'bookings'
      AND column_name IN ('start_time', 'end_time', 'occupied_until')
  `)

  const types = new Map(
    (columns.rows as { column_name: string; data_type: string }[]).map((row) => [
      row.column_name,
      row.data_type,
    ]),
  )
  for (const column of TIME_COLUMNS) {
    if (types.get(column) !== EXPECTED_TYPE) {
      throw new Error(
        `bookings.${column} is "${types.get(column) ?? 'missing'}", expected "${EXPECTED_TYPE}". ` +
          'Update the range type in this migration (tsrange for timestamp without time zone).',
      )
    }
  }

  await db.execute(sql`
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
      EXCLUDE USING gist (tstzrange("start_time", "occupied_until", '[)') WITH &&)
      WHERE ("status" <> 'cancelled' AND "start_time" IS NOT NULL);

    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_times_consistent" CHECK (
      ("start_time" IS NULL AND "end_time" IS NULL AND "occupied_until" IS NULL)
      OR (
        "start_time" IS NOT NULL
        AND "end_time" > "start_time"
        AND "occupied_until" >= "end_time"
      )
    );

    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_has_time" CHECK (
      "mode" <> 'slot' OR "start_time" IS NOT NULL
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_slot_has_time";
    ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_times_consistent";
    ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_no_overlap";
  `)
}
