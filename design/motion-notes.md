# Motion notes — C1 · Sunlit Arch

Copied from the "Beauty Home Directions" canvas (https://claude.ai/artifact/REcipyD9SbLCzhiQopznxC), in page order. Board: [home-c1-sunlit-arch.html](home-c1-sunlit-arch.html).

## WHOLE PAGE (both variants)

Fine film grain over everything (static, ~8%). Motion is slow and soft: 400–800 ms eases, at most one looping element per screen. With reduced motion on, loops stop and reveals become plain fades.

## HERO · on load

Photo eases from 1.06 to 1 scale over 1.6 s. Headline lines rise 24 px and fade in, 120 ms apart. The Book badge's text ring turns slowly (24 s per turn) and presses to 0.96 on tap.
On scroll: photo drifts at 0.85× scroll speed (gentle parallax).

## STICKY BAR · Book + WhatsApp

Slides up 16 px and fades in 600 ms after the hero. Stays pinned to the bottom; hides on a fast scroll down, returns on scroll up. WhatsApp gives one soft pulse after 8 s idle.

## MARQUEE · continuous

Drifts left, about 42 s per loop. Slows to half speed while a finger rests on it.

## INTRO · on scroll

Arch photo rises 40 px over the marquee edge as its shadow deepens. Paragraph fades in line by line. Signature writes itself left to right once (stroke reveal, 1.8 s).

## SERVICES · on scroll + tap

Terracotta floods in as the section enters (400 ms). Cards slide in from alternating sides, 80 ms apart. On tap a card lifts (shadow grows, rises 4 px). The brushes circle drifts slightly slower than the page.

## BEFORE / AFTER · the big moment (works in Play)

On first view the handle sweeps 50 → 70 → 50% once to invite a drag. Drag anywhere on the image; the handle follows with a soft spring. Pair chips cross-fade to the next pair and reset to 50%.

## PRODUCT RAIL · swipe (works in Play)

Scroll-snaps card by card. Images drift slightly against their cards while swiping. Tapping + turns it into a check mark and the bag icon in the header bumps.

## REVIEWS · tap arrows or swipe (works in Play)

The front card slides off with a slight rotation; the next settles out of the stack on a spring (450 ms). Active dot stretches to a bar.

## VISIT · on scroll

Middle arch rises over the reviews edge; side arches follow 100 ms later. Info rows fade in 60 ms apart.

## FOOTER

Arch mark draws on; the signature fades in last. Nothing loops.

---

# Remaining pages — batch 1

Copied from the "Remaining pages — batch 1" row of the same canvas. Boards: [services-c1-sunlit-arch.html](services-c1-sunlit-arch.html), [gallery-c1-sunlit-arch.html](gallery-c1-sunlit-arch.html), [about-c1-sunlit-arch.html](about-c1-sunlit-arch.html), [contact-c1-sunlit-arch.html](contact-c1-sunlit-arch.html).

## ALL FOUR PAGES

Same header, sticky bar, footer and grain as the C1 home, same grammar: expo ease, 400–800 ms, nothing loops. Page titles rise 24 px, lines 120 ms apart, on load; the sticky bar rises at 0.6 s. Scroll reveals rise 24–40 px over 0.8 s. Buttons press to 0.97. Reduced motion: every reveal becomes a 0.3 s fade.

## SERVICES

**Page head.** Title lines rise 24 px, 120 ms apart. The two chips fade in after. Tapping a chip scrolls smoothly to its group; the ink fill moves to the chosen chip (250 ms).

**Makeup · terracotta field.** Clay floods in as the section enters (400 ms, a limestone layer fades away). The small arch rises 24 px. Service rows fade up 16 px, 60 ms apart.

**Bridal & occasions · request cards.** Cards slide in from alternating sides, 80 ms apart (home services grammar). On tap a card lifts 4 px as its shadow grows. "Send a request" opens the date and details form; no time picker appears.

**Skincare · on scroll.** Arch photo rises 40 px as its shadow deepens; rows fade up 60 ms apart. The WhatsApp line below just fades in.

## GALLERY

**Filter chips (works in Play).** The ink fill moves to the chosen chip (250 ms). Photos that leave fade out (150 ms); the ones that stay glide to their new place on a soft spring; newcomers fade up 40 ms apart. The pair chips below follow the same filter.

**Arch grid · on scroll.** Each arch rises 32 px and fades in, 80 ms apart, start column first (mirrored in Arabic). The photo inside eases from 1.04 to 1. Tap opens the photo full screen, growing out of its arch.

**Before / after (works in Play).** Same slider as the home page: one 50 → 70 → 50% sweep on first view, then drag on a spring. Pair chips cross-fade to the next pair and reset to 50%. Mirrored in RTL.

**Book band.** Terracotta floods in (400 ms); heading rises, the button follows 120 ms later.

## ABOUT

**Portrait · on load.** Greeting lines rise 24 px, 120 ms apart. The arch portrait settles from 1.06 to 1 (1.6 s). The small circle drifts at 0.9× scroll speed, like the brushes circle on home.

**Story · on scroll.** Paragraphs fade up line by line. The two arches rise 40 px, 100 ms apart. The clay rule above the quote draws in the reading direction (600 ms), then the quote fades in.

**Facts & signature.** Figures fade in 60 ms apart (no counting up). Certification rows fade in. The signature writes itself once in the reading direction (1.8 s stroke reveal).

**Book · terracotta field.** Clay floods in (400 ms); heading rises, buttons follow 120 ms apart.

## CONTACT

**Map arch · on load.** Title lines rise as on every page. The map arch rises 24 px as its shadow deepens; the location chip pops in after it (scale 0.9 → 1, 200 ms). Info rows fade in 60 ms apart.

**Hours · terracotta field.** Clay floods in (400 ms); the card rises 24 px. Today is marked when the page loads; nothing on it moves.

**FAQ (works in Play).** One answer open at a time. The plus turns 45° into a cross (200 ms); the answer fades in and rises 8 px. Rows below move without a height tween (transform and opacity only). Reduced motion: no rise, just the fade.

## Developer brief additions (scroll-linked)

The developer asked for scroll-LINKED motion on these pages (plays forward on scroll down, reverses on scroll up), on top of the notes above: section headings reveal word by word; arch photos scale 1.08 → 1 and drift slightly (parallax); Services category headings stay pinned while their list scrolls; Gallery items rise in a stagger and filter changes use layout animation; About pins her portrait while the story scrolls past (desktop); FAQ items expand and collapse smoothly. GPU-only, Motion's `scroll()` (ScrollTimeline where supported), mirrored in RTL, visible without JavaScript, simple fades under reduced motion.
