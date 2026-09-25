import {
  Amiri,
  Aref_Ruqaa,
  Fraunces,
  Manrope,
  Mrs_Saint_Delafield,
  Readex_Pro,
} from 'next/font/google'

/**
 * Self-hosted by next/font at build time: no request to Google from the visitor's phone.
 * Only the English pair is preloaded. Arabic and script faces load when a page uses them,
 * so each language downloads only its own fonts. `display: swap` keeps text readable on
 * slow connections while the font arrives.
 */
export const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-manrope',
  display: 'swap',
})

export const delafield = Mrs_Saint_Delafield({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-delafield',
  display: 'swap',
  preload: false,
})

export const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap',
  preload: false,
})

export const readex = Readex_Pro({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-readex',
  display: 'swap',
  preload: false,
})

export const ruqaa = Aref_Ruqaa({
  subsets: ['arabic'],
  weight: '400',
  variable: '--font-ruqaa',
  display: 'swap',
  preload: false,
})

export const fontVariables = [fraunces, manrope, delafield, amiri, readex, ruqaa]
  .map((f) => f.variable)
  .join(' ')
