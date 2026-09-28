/**
 * PALETTE PREVIEW (branch design-pink): whether the preview switches (?palette=, ?photos=off)
 * exist at all. On in development; in a production build only with PALETTE_PREVIEW=on
 * (next.config.ts inlines it, so server and client components agree).
 */
export const previewEnabled =
  process.env.NODE_ENV !== 'production' || process.env.PALETTE_PREVIEW === 'on'
