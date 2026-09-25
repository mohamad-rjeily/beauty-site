import type { GroupField, PayloadRequest } from 'payload'

import { msg, t } from '@/lib/i18n'

export const CURRENCIES = ['USD'] as const
export type Currency = (typeof CURRENCIES)[number]
export const DEFAULT_CURRENCY: Currency = 'USD'

type MoneyFieldOptions = {
  name: string
  label: Record<string, string>
  required?: boolean
  /** Server-calculated values (order snapshots and totals) are shown but never edited. */
  readOnly?: boolean
}

/**
 * Money is stored as integer cents plus a currency code, never as a float,
 * so 19.99 can't turn into 19.989999 on the way through.
 */
export const moneyField = ({
  name,
  label,
  required = true,
  readOnly = false,
}: MoneyFieldOptions): GroupField => ({
  name,
  type: 'group',
  label,
  admin: { readOnly },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'amount',
          type: 'number',
          label: t('Amount in cents', 'المبلغ بالسنت'),
          required: required && !readOnly,
          min: 0,
          admin: {
            readOnly,
            step: 1,
            width: '60%',
            description: readOnly ? undefined : t('Example: 2500 = $25.00', 'مثال: 2500 = 25.00$'),
          },
          validate: (value: number | null | undefined, { req }: { req: PayloadRequest }) => {
            if (value === null || value === undefined) {
              return required && !readOnly
                ? msg(req, 'This field is required.', 'هذا الحقل مطلوب.')
                : true
            }
            if (!Number.isInteger(value) || value < 0) {
              return msg(
                req,
                'Enter a whole number of cents (0 or more).',
                'أدخلي عدداً صحيحاً من السنتات (0 أو أكثر).',
              )
            }
            return true
          },
        },
        {
          name: 'currency',
          type: 'select',
          label: t('Currency', 'العملة'),
          required: !readOnly,
          defaultValue: DEFAULT_CURRENCY,
          options: CURRENCIES.map((code) => ({ label: code, value: code })),
          admin: { readOnly, width: '40%' },
        },
      ],
    },
  ],
})
