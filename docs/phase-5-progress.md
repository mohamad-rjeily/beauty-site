# Phase 5 · Shop — progress

Branch `phase-5-shop`. Plan approved on 2026-09-28 with these changes: fashion items hidden
from the public site and refused by checkout; inline "Added to your cart" confirmation;
order-number retry on collision; design check (screenshots) after checkpoint 2.

Resume with "continue where you stopped": pick up the first unchecked item.

## Checkpoint 1 · Schema + migration
- [x] Products: `size`, `howToUse` (brand only)
- [x] Orders: `street`, `building`, `floor`, `landmark` (replace `address`), `notes`, `locale`,
      `orderNumber`, `checkoutId`, `deliveryFee`
- [x] Site settings: Shop group with optional `deliveryFee`
- [x] priceOrder: order number (+ collision check), delivery fee snapshot, total includes fee,
      public orders refuse fashion items
- [x] Migration file, applied to the dev database
- [x] Typecheck, lint, verify:rules; commit

## Checkpoint 2 · Shop list + product page
- [x] `/[lang]/shop` with category chips (`?category=`), no fashion items
- [x] `/[lang]/shop/[slug]`: photo strip, homemade / brand details, quantity + add (button inert
      until the cart exists), metadata + OG + hreflang
- [x] Links: menu/footer shop, home rail cards → product page
- [x] Demo data for the screenshots (homemade category, brand fields)
- [x] Commit, then STOP: mobile EN/AR + desktop screenshots for design approval
- [ ] Owner approval of the screenshots (then start checkpoint 3)

## Checkpoint 3 · Cart
- [ ] `src/lib/cart.ts` store + pure maths
- [ ] Bag count in all header states, bump on add
- [ ] Inline "Added to your cart · View cart" (aria-live) on product page and home rail
- [ ] `/[lang]/cart` with server refresh and change notices
- [ ] Commit

## Checkpoint 4 · Checkout + WhatsApp
- [ ] Shared `withinLimit` in `src/lib/rateLimit.ts` (booking moved over)
- [ ] `src/lib/order.ts` placeOrder (zod, honeypot, rate limit, checkoutId, number retry)
- [ ] Checkout form on the cart page; sessionStorage details
- [ ] Success screen + `src/lib/orderMessage.ts` WhatsApp message
- [ ] Commit

## Checkpoint 5 · Admin + demo data
- [ ] Orders list columns, order summary panel
- [ ] demo:seed / demo:clear orders
- [ ] Commit

## Checkpoint 6 · Rule + unit tests
- [ ] verify:rules shop checks (incl. fashion refused)
- [ ] Unit tests: cart maths, order message, fee display, order number
- [ ] Commit

## Checkpoint 7 · E2E
- [ ] e2e-db setup/clean (orders, stock snapshot)
- [ ] Shop specs
- [ ] Full finish run; commit

## Notes
- Migrations `20260927_214509_shop` + `20260927_214521_shop_drop_address` (split so the schema
  tool never prompts about a rename). Applied to the dev database.
- Checkpoint 2: Shop page texts tab in `pages` (migration `20260927_222744_shop_page_texts`).
  Demo seed: "DEMO Homemade masks" category (slug `demo-masks`), brand size/how to use,
  descriptions, a second photo on the rose clay mask, one hidden DEMO fashion item.
  Screenshots: `.impeccable/review/shop-*.png` (`node scripts/screenshots.mjs /shop ...`,
  with MSYS_NO_PATHCONV=1 in Git Bash). The Add to cart button is inert until checkpoint 3.
