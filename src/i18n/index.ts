import { ar } from './dictionaries/ar'
import { en, type Dictionary } from './dictionaries/en'
import type { Locale } from './config'

export type { Dictionary }

const dictionaries: Record<Locale, Dictionary> = { en, ar }

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale]

/** Plural forms of one phrase, by the language's plural rules (Arabic has six). */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }

/** "{n} items" in the right form for n: plural(forms, 1, 'ar') -> "قطعة واحدة". */
export const plural = (forms: PluralForms, n: number, locale: string): string =>
  (forms[new Intl.PluralRules(locale).select(n)] ?? forms.other).replace('{n}', String(n))

/** "From {price}" + { price: '$25' } -> "From $25". */
export const format = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
