/**
 * PALETTE PREVIEW (branch design-pink): not for production.
 *
 * ?palette=blush | rose | petal sets <html data-palette="…">, which swaps the colour tokens
 * (see the PALETTE PREVIEW block at the end of globals.css). Without the query parameter the
 * site is unchanged. The attribute stays on <html> while browsing with in-site links, because
 * React never touches attributes it didn't render; a full reload without the parameter drops it.
 *
 * An inline script (not an effect) so the colours are right on the first paint, with no flash.
 * Rendered only in development, or when PALETTE_PREVIEW=on (e.g. a preview deployment for the
 * owner). To remove: delete src/preview/ and its one line in [lang]/layout.tsx.
 */
const palettes = ['blush', 'rose', 'petal']

const script = `(function(){try{var p=new URLSearchParams(location.search).get('palette');if(${JSON.stringify(
  palettes,
)}.indexOf(p)>-1)document.documentElement.setAttribute('data-palette',p)}catch(e){}})()`

export function PalettePreview() {
  if (process.env.NODE_ENV === 'production' && process.env.PALETTE_PREVIEW !== 'on') return null
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
