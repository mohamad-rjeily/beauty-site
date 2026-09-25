import type { TextField } from 'payload'

import { msg, t } from '@/lib/i18n'
import { isValidPhone, normalizePhone } from '@/lib/phone'

type PhoneFieldOptions = {
  name?: string
  label?: Record<string, string>
  required?: boolean
}

/**
 * Phone number stored in international format (+961...).
 * The beforeValidate hook tidies the input ("00961 3-123 456" -> "+9613123456"),
 * then validate() rejects anything that still isn't a valid international number.
 * Both run on the server for every write, whatever sends the data.
 */
export const phoneField = ({
  name = 'phone',
  label = t('Phone', 'رقم الهاتف'),
  required = true,
}: PhoneFieldOptions = {}): TextField => ({
  name,
  type: 'text',
  label,
  required,
  admin: {
    placeholder: '+961 3 123 456',
    description: t(
      'International format, starting with + and the country code.',
      'بالصيغة الدولية، يبدأ بـ + ورمز البلد.',
    ),
  },
  hooks: {
    beforeValidate: [({ value }) => (typeof value === 'string' ? normalizePhone(value) : value)],
  },
  validate: (value: string | null | undefined, { req }) => {
    if (!value) return required ? msg(req, 'This field is required.', 'هذا الحقل مطلوب.') : true
    return (
      isValidPhone(value) ||
      msg(
        req,
        'Use international format, e.g. +961 3 123 456.',
        'استخدمي الصيغة الدولية، مثال: +961 3 123 456.',
      )
    )
  },
})
