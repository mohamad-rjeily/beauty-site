# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Local women in Lebanon, mostly arriving from Instagram on their phones. Many use mid-range
Android phones on slow or unstable mobile data. They come to decide whether to trust her with
a face, a wedding day or their skin, then to book or to order a product. English and Arabic
speakers, with Arabic read right to left.

The owner (a professional makeup artist and skincare specialist) is the second user. She is not
technical and manages every service, price, photo, product, review and text herself from the
admin panel, without code.

## Product Purpose

A website and small shop for one makeup artist and skincare specialist. In order of importance:

1. Build trust: real work, real results, clear prices, easy contact.
2. Make booking an appointment effortless on mobile.
3. Let customers order products through WhatsApp.
4. Let the owner run all of it herself from the admin.

Success is a visitor from Instagram who understands what she offers, believes the results, and
books or orders within minutes on a phone.

## Positioning

One person's hands, both crafts: makeup and skincare from the same specialist, with skin care
as the foundation of every look. Bridal and event work is arranged personally by request; regular
appointments are picked as exact time slots.

## Operating Context

- Customers arrive from Instagram links and continue the conversation on WhatsApp.
- Orders are placed through WhatsApp: the checkout saves the order and opens WhatsApp with a
  pre-filled summary to the owner. Delivery or pickup.
- Bookings: time-slot services are picked by the customer; bridal/event requests send a date and
  details, and the owner sets the time when confirming.
- Studio location, hours and contact details are maintained by the owner.

## Capabilities and Constraints

- All prices are in USD. Payment is always cash; there is no online payment.
- Languages: English (default) and Arabic, full RTL, at `/en` and `/ar`.
- Everything editable lives in the admin; nothing customer-facing is hard-coded.
- Must stay fast on mid-range Android phones and weak connections: small pages, optimized
  images, no heavy effects that repaint while scrolling.
- The business name is not decided: `[BRAND_NAME]` everywhere, from one setting.

## Brand Commitments

- Approved home design: "C1 · Sunlit Arch" (`design/home-c1-sunlit-arch.html`) with its motion
  notes (`design/motion-notes.md`).
- Approved palette: "Blush", chosen by the owner: a soft, light, elegant pink (blush-white
  grounds, one deep dusty rose accent). Still not candy pink.
- Elegant, feminine, calm, premium. Not cliché pink, not a generic template.

## Evidence on Hand

None yet. There are no real photos, reviews, prices, stats or claims. Nothing of that kind may
ever be invented: use clearly marked placeholders for photos and clean empty states for content
until the owner adds the real thing in the admin. AI-generated images are never used for results,
before/after photos, faces or products.

## Product Principles

1. Trust is earned with her real work, never with invented proof.
2. Every path ends in a human conversation: booking and ordering lead to WhatsApp.
3. The phone on a weak connection is the primary device, not a fallback.
4. The owner can change anything without a developer.
5. Arabic is a first-class language, not a translation layer.

## Accessibility & Inclusion

Full RTL for Arabic with its own font pairing. Readable contrast, 44px touch targets, keyboard
access, and `prefers-reduced-motion` respected throughout.
