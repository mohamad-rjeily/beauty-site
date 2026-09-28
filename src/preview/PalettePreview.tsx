import { previewEnabled } from './enabled'

/**
 * PALETTE PREVIEW (branch design-pink): not for production.
 *
 * ?palette=blush | rose | petal sets <html data-palette="…">, which swaps the colour tokens
 * (see the PALETTE PREVIEW block at the end of globals.css).
 * ?photos=off sets <html data-photos="off">: every uploaded photo is covered by its Picture
 * placeholder, so the palettes can be judged without the demo images.
 * Without the query parameters the site is unchanged. The attributes stay on <html> while
 * browsing with in-site links, because React never touches attributes it didn't render; a
 * full reload without the parameters drops them.
 *
 * An inline script (not an effect) so the page is right on the first paint, with no flash.
 * It is text/javascript in the server HTML, so the browser runs it while parsing, and
 * text/plain on the client, so React never sees a <script> to render (that is what the
 * "Encountered a script tag" warning is about); suppressHydrationWarning covers the type.
 * To remove: delete src/preview/, its line in [lang]/layout.tsx, the env entry in
 * next.config.ts and the preview layer in Picture.tsx.
 */
const palettes = ['blush', 'rose', 'petal']

const script = `(function(){try{var q=new URLSearchParams(location.search),h=document.documentElement,p=q.get('palette');if(${JSON.stringify(
  palettes,
)}.indexOf(p)>-1)h.setAttribute('data-palette',p);if(q.get('photos')==='off')h.setAttribute('data-photos','off')}catch(e){}})()`

export function PalettePreview() {
  if (!previewEnabled) return null
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  )
}
