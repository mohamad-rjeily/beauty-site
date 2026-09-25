# [BRAND_NAME] website

Website, booking system and shop for a makeup artist and skincare specialist in Lebanon.
Next.js (App Router) + Payload CMS 3 (admin at `/admin`) + PostgreSQL (Neon).

Project rules, the data model and the build phases are in [CLAUDE.md](CLAUDE.md).
The approved design is in [design/](design/).

## Requirements

- Node.js 20.9 or newer (developed on Node 22)
- npm
- A PostgreSQL database (Neon)

## First-time setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` (git-ignored, never commit it). Copy `.env.example` and fill in:

   | Variable         | What it is                                                                                          |
   | ---------------- | --------------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`   | Neon connection string, e.g. `postgresql://user:password@host/dbname?sslmode=require`                |
   | `PAYLOAD_SECRET` | Long random string that signs admin logins. Generate one with the command below. Keep it secret.     |

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Create the database tables by running the migrations (see below):

   ```bash
   npm run migrate
   ```

4. Start the dev server and open <http://localhost:3000/admin>:

   ```bash
   npm run dev
   ```

## Creating the first admin user

When the database has no users yet, `/admin` shows a **Create first user** form.
Fill in email and password: that account is the first admin.

After that, public sign-up is closed. More admins (only the owner and the developer)
are added by a logged-in admin under **Settings → Admin users → Create new**.

Each admin can switch the admin panel between English and Arabic in their account settings.

## Database migrations

Automatic schema "push" is turned off (`push: false` in `src/payload.config.ts`). Every change
to the database structure goes through a migration file in `src/migrations/`, committed to git.
This keeps production safe and protects the hand-written no-double-booking constraint.

| Command                         | What it does                                                           |
| ------------------------------- | ---------------------------------------------------------------------- |
| `npm run migrate`               | Applies all migrations that haven't run yet                            |
| `npm run migrate:status`        | Lists migrations and whether each has run                              |
| `npm run migrate:create <name>` | Generates a new migration from changes to collections, globals or fields |

After changing any collection, global or field:

```bash
npm run migrate:create describe-the-change   # generates src/migrations/<date>_describe-the-change.ts
# review the generated SQL, then:
npm run migrate
npm run generate:types                       # refreshes src/payload-types.ts
```

## Other scripts

| Command                      | What it does                                             |
| ---------------------------- | -------------------------------------------------------- |
| `npm run dev`                | Dev server on port 3000                                  |
| `npm run build` / `npm start` | Production build / run it                               |
| `npm run typecheck`          | TypeScript check (run before calling anything done)      |
| `npm run lint`               | ESLint                                                   |
| `npm run generate:types`     | Regenerates `src/payload-types.ts` from the config       |
| `npm run generate:importmap` | Regenerates the admin import map after adding admin components |
| `npm run verify:rules`       | Checks the booking and order rules against the database, then deletes its test data |

## Where things live

```
src/
  payload.config.ts      Payload config: locales (en, ar), admin languages, database
  collections/           services, gallery, products, categories, bookings, orders,
                         testimonials, faq, media, users
  globals/               site-settings (brand name, WhatsApp, links), availability (hours)
  hooks/bookings/        booking rules (two modes, working hours, notice, break, no overlaps)
  hooks/orders/          server-side pricing, atomic stock changes, delivered is final
  hooks/products/        atomic "adjust stock by"
  components/admin/      dollars input and column, cash-only note
  access/                who may do what; isAdminRequest (admin exemptions)
  fields/                shared fields: money (cents + currency), phone, slug
  lib/                   time zone (Asia/Beirut), phone validation, transaction helper
  migrations/            database migrations (booking_constraints is hand-written)
scripts/
  verify-rules.ts        rule checks against the database (npm run verify:rules)
```

## Business rules enforced on the server

- **No double bookings.** A database exclusion constraint rejects overlapping non-cancelled
  bookings that have times, including the break after each appointment. Request bookings
  without a time are ignored by it.
- **Two booking modes.** `slot` bookings get their end time from the service duration.
  `request` bookings (bridal, events) have no time until the owner confirms them and enters
  the start and end herself.
- **Website vs admin.** Bookings from the website (no logged-in user) must respect minimum
  notice, the days-ahead window, working hours, the start-time step and closed dates.
  Logged-in admins are exempt from those, never from no-overlap or the break.
- **Orders via WhatsApp, cash only.** Prices are recalculated from the products table when
  an order is created, and public orders always start as `new`. Delivery or pickup; the
  address is required for delivery only.
- **Stock** goes down only when an order is confirmed (atomic conditional update) and comes
  back when a confirmed order is cancelled. Delivered orders are final. Stock is changed by
  hand only through "Adjust stock by", which also stops an open form from overwriting it.
- **Customer data** (bookings, orders, users) is readable only by logged-in admins.

Run `npm run verify:rules` after changing any of these rules.
