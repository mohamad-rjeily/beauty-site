import { ar } from './dictionaries/ar'
import { en, type Dictionary } from './dictionaries/en'
import type { Locale } from './config'

export type { Dictionary }

const dictionaries: Record<Locale, Dictionary> = { en, ar }

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale]

/** "From {price}" + { price: '$25' } -> "From $25". */
export const format = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
