import type { Dictionary } from '@/i18n'

/** Only the labels the header needs travel to the browser, not the whole dictionary. */
export type NavLabels = Pick<
  Dictionary,
  'switchLanguage' | 'switchLanguageLabel' | 'menu' | 'mainNav' | 'nav'
>

export const navLabels = (t: Dictionary): NavLabels => ({
  switchLanguage: t.switchLanguage,
  switchLanguageLabel: t.switchLanguageLabel,
  menu: t.menu,
  mainNav: t.mainNav,
  nav: t.nav,
})
