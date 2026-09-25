# Beauty Studio Website — Project Instructions

## What this project is
A website + online shop for a professional makeup artist and skincare specialist in Lebanon.
Customers are local women, mostly arriving from Instagram on their phones.
Business name is not decided yet: use the placeholder `[BRAND_NAME]` everywhere and keep it in ONE config value.

Goals, in order of importance:
1. Build trust (real work, real results, clear prices, easy contact).
2. Make booking an appointment effortless on mobile.
3. Let customers order products (cash on delivery / pay in person, NO online payment).
4. Let the owner manage everything herself from an admin panel, without code.

## Stack (do not change without asking)
- Next.js (App Router) + TypeScript (strict mode)
- Payload CMS 3 running inside the same Next.js app; it provides the admin panel at `/admin`
- PostgreSQL (Neon) via Payload's Postgres adapter
- Tailwind CSS + shadcn/ui-style components
- Motion (motion/react) for animation
- Media storage: cloud storage adapter for Payload (configured at deploy time)
- Email notifications: Resend
- Package manager: npm

## Architecture rules
- ALL editable content (services, prices, photos, products, gallery, texts, opening hours) lives in Payload collections or globals. Never hardcode content in components.
- Server Components by default. Use Client Components only for interactivity (booking picker, cart, animations).
- Fetch data with Payload's Local API on the server, not via HTTP to our own API.
- Validate every form on the server (never trust the client). Use zod for input schemas.
- Money is stored as integer cents with a currency code. Default currency: USD.
- Dates/times are stored in UTC and displayed in `Asia/Beirut`.

## Data model (Payload collections)
- `services`: name, category (makeup / skincare), description, price, duration (minutes), images, active, sort order
- `gallery`: title, category, before image, after image (optional), service relation, featured flag
- `products`: name, slug, category, brand, description, price, images, stock, active, type (`brand` / `homemade` / `fashion`)
  - homemade masks ALSO require: ingredients, made-on date, expiry date, storage instructions, usage instructions, patch-test note (shown on the product page)
  - fashion items (phase 2): variants (size, color) with per-variant stock
- `categories`: for products
- `availability` (global): weekly working hours + blocked dates/holidays + slot interval
- `bookings`: customer name, phone, service, start time, end time, status (`pending` / `confirmed` / `cancelled` / `completed`), notes
- `orders`: customer name, phone, address, area, items (snapshot of name + price at order time), total, payment method (`cod` / `in_person`), status (`new` / `confirmed` / `delivered` / `cancelled`)
- `testimonials`, `faq`: simple content collections
- `site-settings` (global): brand name, WhatsApp number, Instagram URL, location text, map link, announcement bar

## Business rules (must never be broken)
- NO double bookings: two non-cancelled bookings may never overlap. Enforce in the database/transaction, not only in the UI.
- New bookings start as `pending`; only the owner confirms or cancels.
- A booking slot must fit fully inside working hours and not touch a blocked date.
- Order totals are recalculated on the server from current product prices; never trust prices sent by the client.
- Stock decreases only when an order is confirmed; out-of-stock products cannot be ordered.
- Customer data (names, phones, addresses) is private: never logged, never exposed in public API responses.

## WhatsApp
- Floating WhatsApp button on every page (wa.me link with a pre-filled message). Number comes from `site-settings`.
- After checkout or booking request, offer "Send on WhatsApp" with a pre-filled summary of the order/booking.
- No WhatsApp Business API for now.

## Languages
- Locales: English (`en`, default) and Arabic (`ar`). URLs: `/en/...` and `/ar/...`.
- Payload localization is enabled for all customer-facing text fields (names, descriptions, instructions, FAQ, testimonials).
- Arabic must use full RTL layout (`dir="rtl"`, logical CSS properties like `ms-`/`me-`, `ps-`/`pe-`, never `ml-`/`mr-`).
- Arabic needs its own font pairing that matches the Latin fonts; never let Arabic fall back to a system font.
- Directional icons (arrows, chevrons) flip in RTL; the before/after slider and carousels must work correctly in RTL.

## Design direction
- APPROVED DESIGN: direction "C1 · Sunlit Arch" (terracotta, arches, bolder). The reference files are in `design/`: follow them for layout, colors, typography and the motion notes. If code and design disagree, the design wins unless the developer says otherwise.
- Elegant, feminine, calm, premium. NOT cliché pink, NOT generic template/SaaS look.
- Mobile-first: design for a 390px wide phone first, then scale up.
- Real photos are the hero. Layouts must make her work look good.
- Animation: subtle and purposeful (reveals, hovers, page transitions). Always respect `prefers-reduced-motion`.
- Performance: fast on mid-range phones and slow mobile data. Optimize every image (next/image, modern formats).

## Skills and tools: who does what
- `/design`: visual mockups BEFORE building a page, for the owner's approval.
- Impeccable: the lead design authority. Its rules win any design conflict.
- UI UX Pro Max: reference only, for palettes and font pairings when setting up the design system.
- frontend-design: backup design guidance; do not let it override Impeccable.
- Motion skill + MCP: building animations.
- Emil Kowalski skills: `review-animations` to review animations; `pick-ui-library` when choosing a dependency; `emil-design-eng` for polish.
- 21st.dev MCP: source of components; always adapt them to our design system, never paste them in raw.
- `find-skills` and `find-animation-opportunities`: use ONLY when explicitly asked.

## Content rules
- NEVER use AI-generated images for results, before/after photos, faces, or products. Only real photos.
- AI or code-generated visuals are allowed only for decoration (textures, backgrounds).
- Never invent services, prices, reviews, or claims. Use clear placeholders like `[SERVICE_PRICE]` until real data exists.

## Security
- Secrets live only in `.env` (git-ignored). Never hardcode keys, never print them, never commit them.
- Keep `.env.example` updated with variable NAMES only (no values).
- Admin panel requires login; only the owner and the developer have accounts.

## Working style
- Before a big change, propose a short plan and wait for approval.
- Make small, focused changes and commit after each working step with a clear message.
- Give full file contents when showing changes to the developer (no partial snippets).
- Run the type check and lint before saying something is done.
- If something is unclear about the business, ASK instead of guessing.
- The developer knows C# well but is newer to TypeScript/React: explain non-obvious patterns briefly.

## Build phases
1. Design approval with `/design` (home, services, product page, mobile)
2. Project setup: Next.js + Payload + Postgres, all collections, admin working
3. Public site: home, services, gallery, about, contact, WhatsApp button
4. Booking system with calendar and admin confirm/cancel
5. Shop: products, cart, cash-on-delivery checkout, order notifications
6. Deploy, domain, owner training
7. Later: fashion items with sizes/colors, booking reminders, more languages
