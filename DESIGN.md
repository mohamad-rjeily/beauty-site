---
name: "[BRAND_NAME] Beauty Studio"
description: "C1 · Sunlit Arch in the Blush palette: a light, blush-white studio seen through arches, one deep rose accent, bilingual English and Arabic."
colors:
  clay: "#a8475e"
  clay-deep: "#7d3043"
  clay-tint: "#e6b3bd"
  clay-mist: "#f8e1e5"
  sage: "#5e6b55"
  earth: "#3a2529"
  earth-soft: "#d3bcc0"
  limestone: "#f8f2f0"
  paper: "#fcf9f7"
  paper-bright: "#fffdfc"
  sand: "#f1e3e1"
  line: "#e5d3d1"
  stone: "#9a8387"
  ink: "#2c2326"
  ink-soft: "#5b4a4f"
typography:
  display:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "5.5rem"
    fontWeight: 300
    lineHeight: 0.92
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 300
    lineHeight: 0.92
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.03em"
  lede:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "1.3125rem"
    fontWeight: 300
    lineHeight: 1.45
  body:
    fontFamily: "Manrope, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.6
  script:
    fontFamily: "'Mrs Saint Delafield', cursive"
    fontSize: "4rem"
    fontWeight: 400
    lineHeight: 1
  display-ar:
    fontFamily: "Amiri, 'Noto Naskh Arabic', serif"
    fontSize: "5.5rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0"
  body-ar:
    fontFamily: "'Readex Pro', Manrope, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.75
  script-ar:
    fontFamily: "'Aref Ruqaa', Amiri, serif"
    fontSize: "2.75rem"
    fontWeight: 400
    lineHeight: 1
rounded:
  card: "1.25rem"
  pill: "9999px"
  arch: "9999px 9999px 0.5rem 0.5rem"
  inner: "0.5rem"
  focus: "4px"
spacing:
  gutter: "1.5rem"
  gutter-lg: "2.5rem"
  container: "75rem"
  section: "4rem"
  section-lg: "7rem"
  card-inset: "0.625rem"
  action-height: "3.25rem"
  touch-min: "2.75rem"
components:
  button-primary:
    backgroundColor: "{colors.clay}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.5rem"
    height: "{spacing.action-height}"
  button-primary-hover:
    backgroundColor: "{colors.clay-deep}"
    textColor: "{colors.paper}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.5rem"
    height: "{spacing.action-height}"
  button-ink-hover:
    backgroundColor: "{colors.earth}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.5rem"
    height: "{spacing.action-height}"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-whatsapp:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    size: "{spacing.action-height}"
  card-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-inset}"
  card-product:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-inset}"
    width: "13.75rem"
  chip-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "{spacing.touch-min}"
  chip-toggle-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  book-badge:
    backgroundColor: "{colors.clay}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    size: "6.75rem"
  sticky-bar:
    backgroundColor: "{colors.paper}"
    padding: "0.625rem 1rem"
---

# Design System: [BRAND_NAME] Beauty Studio

## Overview

**Creative North Star: "The Sunlit Arch"**

A light-filled studio in Lebanese afternoon light, seen through arched windows. Soft, unhurried and hand-made: blush-white grounds carry a single deep rose field, photographs of her work sit inside arch-topped frames, and every action is a soft pill. Surfaces are tactile rather than glossy: a pre-rendered paper grain lies under every section, and cards sit on layered, downward shadows as if on a sunlit table.

The system is bilingual by construction. English and Arabic are two equal pairings, not a translation layer: Fraunces light over Manrope, Amiri over Readex Pro, each with its own leading, tracking and size, and a handwritten signature in each script (Mrs Saint Delafield, Aref Ruqaa). Every layout is written in logical properties so Arabic mirrors without a second stylesheet. Density is low on phones (one idea per viewport) and composes onto a 12-column grid on desktop where photos break the grid, overlapping section edges.

Motion is warm and brief: things settle and rise into place with an expo ease, the rose field floods in, a signature writes itself in the reading direction. Content is always present in the HTML without JavaScript; motion only decorates arrival.

**Key Characteristics:**
- Blush-white grounds with a light, rose-toned pre-rendered grain; one deep rose field per page.
- Arch-topped photo frames (fully rounded top, small-radius foot) as the recurring silhouette.
- Pill actions only; one Book destination.
- Fraunces light display with italic emphasis marked by the CMS; Amiri in Arabic, never slanted.
- Layered, rose-tinted, downward shadows; no hard or offset shadows.
- Logical CSS everywhere; directional icons and motion mirror in RTL.

## Colors

**Blush**, the palette the owner chose: soft, light and elegant pink. Warm white grounds with a blush cast, pale blush tints, and one deep, dusty rose that carries every action. It is deliberately not candy pink: the saturated colour is kept dark and dusty (clay, clay-deep), the light pinks are pale and low-chroma, and ink is a deep plum-brown rather than black. One muted secondary (sage) belongs to WhatsApp alone.

The token names come from the first, terracotta palette and were kept to avoid churn: **clay is now the rose accent**, earth is the deep plum-brown footer, limestone and sand are blush-white grounds.

### Primary
- **Deep Rose** (clay, #a8475e): the brand's one voice. The services field background, the default Book pill, the rotating Book badge, the hero's third headline line, the signature, the "after" label, the focus ring, and the contact-row and map-pin icons.
- **Garnet** (clay-deep, #7d3043): hover state of rose actions, rating stars, text links on sand, and the cross-script accent lines (the Arabic line on the English page, and the reverse).
- **Blush** (clay-tint, #e6b3bd): selection highlight, the signature on the earth footer, marquee sparkle fills.
- **Rose Mist** (clay-mist, #f8e1e5): a pale rose for fills and large type. On the rose field it passes AA only by a hair (4.53:1), so body copy on clay stays paper.

### Secondary
- **Olive Sage** (sage, #5e6b55): WhatsApp, and only WhatsApp: the WhatsApp buttons, the floating WhatsApp button and its idle ring. It is the one colour not retuned to blush, so the WhatsApp channel stays recognisable. The admin's WhatsApp button uses the same sage; the rest of the admin keeps Payload's own colours.

### Tertiary
- **Plum Earth** (earth, #3a2529): the footer ground with grain, the dark photo placeholder, the hero photo backing, hover state of ink actions.
- **Dusk Rose** (earth-soft, #d3bcc0): secondary text and the arch mark on the earth footer.

### Neutral
- **Blush White** (limestone, #f8f2f0): the page ground and theme colour; hero, intro, results and visit sections.
- **Paper** (paper, #fcf9f7): cards, the sticky action bar, the menu panel, the shop section ground; text on clay, sage and ink.
- **Bright Paper** (paper-bright, #fffdfc): product cards, so they lift off the paper section.
- **Petal Sand** (sand, #f1e3e1): the reviews section ground, the light photo placeholder, row dividers, menu hover.
- **Hairline** (line, #e5d3d1): the rule above the facts row.
- **Mauve Stone** (stone, #9a8387): unselected toggle borders and inactive progress dots.
- **Plum Ink** (ink, #2c2326): all primary text, the marquee band, ink pills.
- **Soft Ink** (ink-soft, #5b4a4f): secondary text, captions, taglines, placeholder text.

### Contrast (WCAG 2.x)
| Text on ground | Ratio | Use |
|---|---|---|
| ink on limestone / paper / sand | 13.78 / 14.56 / 12.22 | all primary text |
| ink-soft on limestone / paper / sand / paper-bright | 7.47 / 7.90 / 6.63 / 8.16 | secondary text |
| paper on clay / clay-deep | 5.37 / 8.43 | rose pills and the rose field |
| clay on limestone / paper / sand | 5.08 / 5.37 / 4.51 | rose type and links |
| clay-deep on limestone / sand | 7.98 / 7.08 | links on sand, stars, cross-script accent lines |
| clay-mist on clay | 4.53 | large type and fills only |
| earth-soft / clay-tint on earth | 7.94 / 7.82 | footer text and signature |
| paper on sage | 5.40 | WhatsApp |
| paper on ink / earth | 14.56 / 13.57 | ink pills, footer |
| stone on limestone / paper | 3.17 / 3.36 | borders and dots (non-text, ≥3:1) |

### Named Rules
**The One Field Rule.** Deep rose floods exactly one section per page (services). Elsewhere clay is a point accent: a pill, a badge, a line of type.

**The Sage Is WhatsApp Rule.** Sage marks the WhatsApp channel and nothing else: not accent lines, not icons, never a general secondary button colour.

**The Blush Neutral Rule.** Every neutral, shadow and placeholder stripe is tinted from ink (rgb 44 35 38) or rose; no pure black, white or cool grey appears anywhere.

**The Not Candy Rule.** Pink stays soft and grown-up: pale, low-chroma tints for grounds and fills, one dark dusty rose for actions. No bright or saturated pink (no fuchsia, bubblegum or hot pink), no pink gradients.

## Typography

**Display Font:** Fraunces, light 300 with italic (fallback Iowan Old Style, Georgia)
**Body Font:** Manrope 400/500/600 (fallback Segoe UI, system-ui)
**Script:** Mrs Saint Delafield (signature only)
**Arabic:** Amiri display (fallback Noto Naskh Arabic), Readex Pro body, Aref Ruqaa signature

**Character:** A soft, high-contrast old-style serif set light and tight against a clean geometric sans; the Arabic pairing trades the italic for Naskh calligraphic contrast and a looser, taller line.

### Hierarchy
- **Display** (300, 5.5rem phone / 6rem desktop, line-height 0.92, -0.03em, balanced): the hero headline only, three lines, the last in clay italic.
- **Headline** (300, 2.5rem / 3.75rem desktop, 0.92): every section heading. Intro greeting is a smaller headline (1.625rem / 3rem, 1.15).
- **Title** (400, 1.5rem service card / 1.25rem product card, 0.92): card titles in the display face.
- **Lede** (300, 1.3125rem / 1.75rem desktop, 1.45, max 34ch): the intro paragraph; review quotes use the same voice at 1.375rem, snug. The marquee sets service names in light italic at 1.625rem.
- **Body** (400, 1rem, 1.6): running text, taglines (0.875rem / 1rem), empty-state notes (0.9375rem, relaxed, max 34ch).
- **Label** (600, 0.9375rem): action text in pills and inline links; 0.8125rem for prices and toggles.
- **Script** (4rem, leading 1, rotated -4deg): the signature; 2.5rem in the footer.

Arabic overrides the whole ladder through `:root:lang(ar)`: display leading 1.25, tracking 0, display weight 400, body 1.0625rem at 1.75; the Ruqaa signature drops to 2.75rem and rotates +3deg.

### Named Rules
**The Starred Emphasis Rule.** Heading emphasis comes from the CMS as `*stars*` and renders as italic `em`. Never hard-code emphasis in a component; never emphasise more than a phrase.

**The No Fake Italic Rule.** Arabic has no italics: `:lang(ar) em` is upright and keeps its colour. Never slant or skew Arabic text, and never apply negative tracking to a connected script.

**The Two Pairings Rule.** Each language loads and uses only its own faces. A cross-script accent line names its family explicitly (Amiri in English pages, Fraunces italic in Arabic pages) and carries its own `lang` and `dir`.

## Layout

Mobile-first at 390px. One container: 24px gutters on phones, 40px from `lg` (1024px), 1200px (75rem) measure. Sections breathe on 4rem vertical padding on phones and 7rem on desktop (reviews run longer: 7rem / 10rem bottom, so the visit arches can overlap them).

On desktop, sections compose on a 12-column grid with a 2.5rem gap, typically heading in 4–5 columns and content in 6–8 starting at column 7. Photos break the grid: the intro arch rises 10rem into the marquee above, the visit arches rise 7rem into the reviews, the hero headline's last line crosses the photo's lower edge onto limestone. Service cards stagger (the second drops 6rem); product cards alternate a 1.75rem offset in a scroll-snap rail.

The hero photo is full-bleed to 38.75rem on phones (min(78vh, 46rem) on desktop). Phones keep a fixed bottom action bar (Book plus WhatsApp) within thumb reach, with safe-area padding; desktop moves Book to the header and floats WhatsApp at the inline-end corner. `scroll-padding-block-end: 6rem` keeps anchored content clear of the bar.

**The Logical Only Rule.** Layout uses logical properties and utilities (start/end, ps/pe, ms/me, inset-inline). Physical left/right classes fail `npm run lint` (`scripts/check-logical-css.mjs`). Direction-dependent transforms use `rtl:` variants.

## Elevation & Depth

Layered and soft. Depth is a tight contact shadow plus one or two long ambient shadows, always offset downward and tinted from ink (or from a deep garnet on the rose field). Surfaces also layer tonally: limestone ground, paper card, bright-paper product card. Texture is part of depth: every major section paints the same pre-rendered 128px paper grain, light and rose-toned (`public/textures/grain.webp`, generated deterministically by `scripts/generate-grain.mjs`) together with its background colour.

### Shadow Vocabulary
- **Soft** (`0 1px 2px rgb(44 35 38 / 0.07), 0 8px 18px rgb(44 35 38 / 0.07), 0 24px 44px rgb(44 35 38 / 0.07)`): resting cards: product cards, the visit card, side arches, stacked review backs.
- **Lift** (`0 1px 2px rgb(44 35 38 / 0.11), 0 10px 24px rgb(44 35 38 / 0.12), 0 30px 60px rgb(44 35 38 / 0.12)`): the one focal object in a group: the book badge, intro arch, centre visit arch, active review card, slider, menu panel, desktop WhatsApp pill.
- **On Clay** (`0 1px 2px rgb(74 20 36 / 0.2), 0 10px 24px rgb(74 20 36 / 0.22), 0 30px 60px rgb(74 20 36 / 0.18)`): paper cards sitting on the rose field (a deeper version fades in on hover).
- **Bar** (`0 -1px 0 rgb(44 35 38 / 0.07), 0 -10px 30px rgb(44 35 38 / 0.1)`): the sticky bottom bar, casting upward.
- **Photo Type** (`text-shadow: 0 2px 24px rgb(44 35 38 / 0.35)`): paper type set over a photo (the hero headline lines on the image), for legibility only.

### Named Rules
**The Sunlight Falls Down Rule.** Shadows are soft, layered and offset downward (the bar alone casts upward because it sits at the bottom edge). No hard offset shadows, no glows, no coloured neon.

**The Baked Grain Rule.** Grain is a pre-rendered tile painted with the background. Never a live SVG `feTurbulence` filter, never a fixed overlay that re-rasterizes on scroll.

## Shapes

Two silhouettes carry the world: the **arch** and the **pill**.

- **Arch:** photo frames are fully rounded at the top with a small-radius foot (0.375–0.875rem, scaled to frame size). Tall portrait ratios (110/190, 150/220, 3/5, 3/7). Framed arches over a photo ground take a 3–4px limestone or paper border.
- **Pill:** every action, toggle, chip, badge, label and the WhatsApp button is fully rounded.
- **Card:** gently rounded containers (1.25rem) with a 0.625rem inset so the arch photo sits inside the card's curve.
- **Mark:** the triple-arch logo mark (after Lebanese triple-arch windows) in 1.2px stroke.

Icons are one authored SVG set on a 24px grid, 1.5 stroke, round caps and joins; directional icons flip in RTL.

## Components

### Buttons
Soft, tactile and certain: one shape (the `PillLink`) for every action.
- **Shape:** fully rounded pill, 3.25rem tall (2.75rem in the header), 1.5rem inline padding, 0.9375rem semibold.
- **Primary (clay):** Book everywhere; hover to clay-deep.
- **Ink:** hover to earth. **Outline:** 1.5px ink border, fills ink on hover (Directions). **Outline light:** 1.5px paper border over photos, fills paper on hover. **Sage:** WhatsApp only.
- **Press:** scales to 0.97 on `:active` (140ms), releases on a 220ms `cubic-bezier(0.23, 1, 0.32, 1)`; colour transitions 200ms. `scale` is listed explicitly in the transition (Tailwind v4 uses the individual `scale` property).
- **Focus:** 2px clay outline, 3px offset, 4px radius (global).
- **Destination:** every Book button gets its href from `bookingHref()` in `src/lib/links.ts`: the booking page `/[lang]/book`, with `?service=<slug>` when the button belongs to a service. The booking page itself shows no Book button (on phones the bottom bar gives way to a floating WhatsApp button). Order buttons get theirs from `orderHref()`; a null href hides the button rather than rendering a dead link. External links open in a new tab with `noopener noreferrer`; site pages use client-side navigation.

### Chips (pair toggles)
- **Style:** 2.75rem pill, 1px stone border, ink 0.8125rem semibold.
- **State:** selected (`aria-pressed`) fills ink with paper text.

### Cards / Containers
- **Corner Style:** 1.25rem.
- **Background:** paper on limestone or clay; bright paper in the product rail.
- **Shadow Strategy:** Soft at rest, On Clay on the rose field, Lift for the single focal card.
- **Border:** none; list rows inside cards divide with a sand hairline.
- **Internal Padding:** 0.625rem around arch photos; 1.25–1.5rem for text cards.

### Photo frames (Picture)
Every photo goes through `Picture`: a real CMS image filling the frame with its focal position, or an honest placeholder (sand or earth ground with a 135deg stripe, camera icon, "Photo coming soon" and a hint of what belongs there). Never stock or generated imagery.

### Navigation
Transparent paper-on-photo header, 4rem tall: brand in the display face, language switch as a 2.75rem ghost pill, bag and menu as 2.75rem round icon buttons with a 10% paper hover. The menu is a native `details` disclosure opening a paper card with Lift. The footer is earth with grain: arch mark, brand, signature in clay-tint script, semibold links.

### Book Badge (signature)
A clay disc (6.75rem, 9rem desktop) at the photo's inline-end edge with Lift, an up-and-onward arrow at its centre, and the Book phrase on a circular text path rotating once every 24s. Latin text is spaced to close the ring; Arabic is never letter-spaced and is sized to fill it.

### Before/After Arch Slider (signature)
An arch frame with Lift; one 1.6s sweep on first view, then drag on a spring (stiffness 380, damping 38, mass 0.6), mirrored in RTL. Paper divider with a 3.5rem paper handle; before/after state labels as small pills (ink 80% / clay).

### Review Deck
A paper card with Lift over two rotated (+4deg, -3deg) stacked backs with Soft; swipe on a spring (stiffness 260, damping 28), a 0.2s fade under reduced motion. Quote in the lede voice; stars in clay-deep; progress as pill dots that scale.

### Motion grammar
- **Arrival:** expo ease `cubic-bezier(0.16, 1, 0.3, 1)`. Hero photo settles from 1.06 scale (1.6s); headline lines rise 24px, staggered 120ms; the bottom bar rises at 0.6s. Scroll reveals rise 24–40px or slide 32px from the reading start/end over 0.8s; the clay field is uncovered by fading a limestone layer; the signature wipes in the reading direction over 1.8s.
- **Ambient:** the badge spins (24s), the marquee loops (duration scaled to its length, reversed in RTL), WhatsApp pulses a single sage ring once after 8s idle.

**The Visible Without JS Rule.** The server renders everything visible. CSS keyframes run from the HTML; scroll reveals only set start states on elements still below the fold after hydration; overlay layers start at opacity 0.

**The Compositor Only Rule.** Animate transform, opacity and clip-path only. Springs animate full transform strings. Under `prefers-reduced-motion` every reveal becomes a 0.3s fade and ambient loops stop.

## Do's and Don'ts

### Do:
- **Do** use `PillLink` for every action and `bookingHref()` for every Book destination.
- **Do** frame her photos in arches through `Picture`, with an honest placeholder until the real photo exists.
- **Do** mark heading emphasis with `*stars*` in the CMS and let `Emphasis` render it.
- **Do** write layout in logical properties; the lint step enforces it.
- **Do** give Arabic its own faces, leading (1.25 display, 1.75 body), zero tracking and upright emphasis.
- **Do** paint the pre-rendered grain with each section background.
- **Do** keep content visible without JavaScript and reduce motion to short fades.
- **Do** keep touch targets at least 2.75rem.

### Don't:
- **Don't** flood more than one section with clay, or use sage for anything but WhatsApp.
- **Don't** add eyebrows or kickers above headings; headings stand alone.
- **Don't** use hard offset shadows, glows or pure black shadows.
- **Don't** italicize, skew or letter-space Arabic.
- **Don't** use physical left/right utilities or hand-mirror layouts.
- **Don't** use stock, AI-generated or icon-font imagery; icons come from the one authored SVG set.
- **Don't** animate layout properties or run live SVG noise filters.
- **Don't** introduce a second button shape or hard-code a WhatsApp link for booking.
