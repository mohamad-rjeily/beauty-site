'use client'

import { FieldDescription, FieldError, FieldLabel, useField, useTranslation } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'
import { useState } from 'react'

const DOLLARS = /^\d+(\.\d{0,2})?$/

/** 2500 -> "25.00". */
export const centsToDollars = (cents: number | null | undefined): string =>
  typeof cents === 'number' && Number.isFinite(cents) ? (cents / 100).toFixed(2) : ''

/**
 * Admin input for money: the owner types dollars ("25" or "25.50"), the form stores
 * integer cents (2500, 2550). The server still validates cents, so this is display only.
 *
 * React note: `text` is what she is typing; `value` is the stored cents. They are kept
 * separate so typing "25." doesn't get reformatted to "25.00" mid-keystroke.
 */
export const DollarsField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<number | null>({ path })
  const { i18n } = useTranslation()
  const [text, setText] = useState(() => centsToDollars(value))
  const [invalid, setInvalid] = useState(false)
  const isReadOnly = readOnly || field.admin?.readOnly

  // Follow outside changes (loading the document, resetting the form). This is React's
  // "adjust state while rendering" pattern: cheaper and safer than a useEffect here.
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    const typedCents = DOLLARS.test(text) ? Math.round(Number(text) * 100) : null
    if (typedCents !== value) setText(centsToDollars(value))
  }

  const onChange = (next: string) => {
    const cleaned = next.replace(',', '.').trim()
    setText(next)
    if (cleaned === '') {
      setInvalid(false)
      setValue(null)
    } else if (DOLLARS.test(cleaned)) {
      setInvalid(false)
      setValue(Math.round(Number(cleaned) * 100))
    } else {
      setInvalid(true)
    }
  }

  return (
    <div className={`field-type number${showError || invalid ? ' error' : ''}`}>
      <FieldLabel label={field.label} path={path} required={field.required} />
      <div className="field-type__wrap">
        <FieldError path={path} showError={showError} message={errorMessage} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--base) / 2)' }}>
          <span aria-hidden="true">$</span>
          <input
            id={`field-${path.replace(/\./g, '__')}`}
            name={path}
            type="text"
            inputMode="decimal"
            dir="ltr"
            placeholder="0.00"
            value={text}
            disabled={isReadOnly}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => !invalid && setText(centsToDollars(value))}
            aria-invalid={showError || invalid}
          />
        </div>
        {invalid && (
          <p className="field-description" role="alert">
            {i18n.language === 'ar'
              ? 'بالدولار، مع رقمين عشريين كحد أقصى، مثال: 25 أو 25.50'
              : 'Dollars with up to 2 decimals, e.g. 25 or 25.50'}
          </p>
        )}
        <FieldDescription description={field.admin?.description} path={path} />
      </div>
    </div>
  )
}
