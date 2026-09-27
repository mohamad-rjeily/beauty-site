# Phase 5 · Shop — progress

## Where we stopped (2026-09-28)
- Checkpoint 4 done (`57ac4b5`). Waiting for the owner's review of the checkout screenshots
  (`.impeccable/review/co-*.png`) and the EN/AR WhatsApp messages.
- Next step: checkpoint 5 (admin order view + demo orders).
- Open notes: a few "E2E-TEST" orders are left in the dev database (the checkpoint 7 clean-up
  removes them); no delivery fee is set in Site settings yet.

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
- [x] Owner approval of the screenshots (approved with 6 fixes, done in checkpoint 3)

## Checkpoint 3 · Cart
- [x] Design fixes: shorter phone photo (name/price/add on the first screen), active chip
      scrolled into view, short dates, price shown with "Out of stock", bottom bar "View cart
      (n)" in the shop, first-screen captures in scripts/screenshots.mjs
- [x] `src/lib/cart.ts` (pure) + `src/lib/cartStore.ts` (localStorage, useSyncExternalStore)
- [x] Bag count in all header states, bump on add
- [x] Inline "Added to your cart · View cart" (aria-live) on product page and home rail
- [x] `/[lang]/cart` with server re-check (`getCartProducts`) and change notices
- [x] Shared `withinLimit` moved to `src/lib/rateLimit.ts` (booking uses it)
- [x] Public product API hides fashion items (collection read access)
- [x] Commit, then send phone screenshots (product first screen, after add, cart with 2)

## Checkpoint 4 · Checkout + WhatsApp
- [x] Fixes first (own commit f151643): private cart check (no names for hidden products),
      one notice box, "changed from {old} to {new}", verify:rules check; regression run:
      verify:rules 43/43, booking e2e 59/59
- [x] `src/lib/order.ts` placeOrder (zod, honeypot, rate limit, checkoutId, number retry)
- [x] `src/lib/orderMessage.ts` (WhatsApp message, delivery fee display, address line)
- [x] Checkout form on the cart page; sessionStorage details + checkout id
- [x] Success screen (OrderDone) + WhatsApp button; cart cleared
- [x] Commit, then send phone screenshots + one EN and one AR WhatsApp message

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
- Checkpoint 3: the cart page behaves like the booking page for the bottom bar (WhatsApp
  floats alone, no pill pointing at the page itself). Last-seen prices are kept in a second
  localStorage key (`cart:seen:v1`) only to point out price changes; never sent anywhere.
- Checkpoint 4: manual checkout runs left a few "E2E-TEST ..." orders (status new, no stock
  moved) in the dev database; the checkpoint 7 clean-up deletes them.
