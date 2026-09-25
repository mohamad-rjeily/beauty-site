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
          label: t('Amount (USD)', 'المبلغ (دولار)'),
          required: required && !readOnly,
          min: 0,
          admin: {
            readOnly,
            width: '60%',
            // Shown and typed in dollars (25.00), stored as integer cents (2500).
            components: {
              Field: '/components/admin/DollarsField#DollarsField',
              Cell: '/components/admin/DollarsCell#DollarsCell',
            },
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
                'Enter a price of 0 or more, with up to 2 decimals.',
                'أدخلي سعراً يساوي 0 أو أكثر، مع رقمين عشريين كحد أقصى.',
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
