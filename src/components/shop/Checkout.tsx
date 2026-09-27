'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'

import { submitOrder } from '@/app/(frontend)/[lang]/cart/order'
import { chipClass, describedBy, Field, inputClass, Notice } from '@/components/booking/parts'
import { IsolatePlaceholders } from '@/components/home/shared'
import { Icon } from '@/components/ui/Icon'
import { formatNodes, Ltr } from '@/components/ui/Ltr'
import type { Dictionary } from '@/i18n'
import { cartSubtotal, type CartRow } from '@/lib/cart'
import type { OrderField } from '@/lib/order'
import { deliveryFee, type Fulfillment, type SavedOrder } from '@/lib/orderMessage'
import { formatPrice } from '@/lib/format'
import { isValidPhone } from '@/lib/phoneFormat'

type Details = {
  name: string
  phone: string
  fulfillment: Fulfillment
  area: string
  street: string
  building: string
  floor: string
  landmark: string
  notes: string
}
type Errors = Partial<Record<OrderField, true>>

const PHONE_EXAMPLE = '03 123 456'
const empty: Details = {
  name: '',
  phone: '',
  fulfillment: 'delivery',
  area: '',
  street: '',
  building: '',
  floor: '',
  landmark: '',
  notes: '',
}

// Personal details stay in this tab only (sessionStorage), never in the address. A refresh
// keeps them; a sent order clears them. The checkout id is kept with them, so sending again
// after a lost answer finds the first order instead of making a second one.
const SAVED_KEY = 'checkout:details'
type Saved = { details: Details; checkoutId: string }

const newCheckoutId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

const readSaved = (): Saved => {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(SAVED_KEY) ?? 'null') as Partial<Saved> | null
    if (value && typeof value.checkoutId === 'string' && value.details) {
      const details = { ...empty }
      for (const key of Object.keys(empty) as (keyof Details)[]) {
        const v = (value.details as Record<string, unknown>)[key]
        if (typeof v === 'string') (details as Record<string, string>)[key] = v
      }
      if (details.fulfillment !== 'pickup') details.fulfillment = 'delivery'
      return { details, checkoutId: value.checkoutId }
    }
  } catch {
    // Nothing saved, or storage blocked.
  }
  return { details: empty, checkoutId: newCheckoutId() }
}
const writeSaved = (saved: Saved) => {
  try {
    window.sessionStorage.setItem(SAVED_KEY, JSON.stringify(saved))
  } catch {
    // The form still works, it just won't survive a refresh.
  }
}
export const clearCheckout = () => {
  try {
    window.sessionStorage.removeItem(SAVED_KEY)
  } catch {
    // Nothing to clear.
  }
}

const price = (cents: number) => <Ltr>{formatPrice(cents, 'USD')}</Ltr>

export type ShopSettings = {
  deliveryFeeCents: number | null
  pickupLocation: string | null
  mapLink: string | null
}

/**
 * The checkout under the cart: name and phone (the booking page's phone rules), delivery or
 * pickup, the address for delivery, then the total and a clear cash-only line right above the
 * Send button. The server re-checks everything and prices the order itself.
 * Rendered only in the browser (after the cart view has hydrated), so reading the saved
 * details while starting is safe.
 */
export function Checkout({
  rows,
  shop,
  ownerName,
  onCartChanged,
  onDone,
  locale,
  t,
}: {
  rows: CartRow[]
  shop: ShopSettings
  ownerName: string
  /** The server says the cart changed (sold out, fewer left...): check it again. */
  onCartChanged: () => void
  onDone: (order: SavedOrder) => void
  locale: string
  t: Dictionary
}) {
  const c = t.checkout
  const [saved] = useState(readSaved)
  const [details, setDetails] = useState<Details>(saved.details)
  const [checkoutId] = useState(saved.checkoutId)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [sending, startSending] = useTransition()

  useEffect(() => writeSaved({ details, checkoutId }), [details, checkoutId])

  const set = <K extends keyof Details>(key: K, value: Details[K]) =>
    setDetails((d) => ({ ...d, [key]: value }))

  const subtotal = cartSubtotal(rows)
  const fee = deliveryFee(details.fulfillment, shop.deliveryFeeCents)
  const total = subtotal + (fee.kind === 'amount' ? fee.cents : 0)
  const phoneExample = { example: <Ltr>{PHONE_EXAMPLE}</Ltr> }
  const delivery = details.fulfillment === 'delivery'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found: Errors = {}
    if (details.name.trim().length < 2) found.name = true
    if (!isValidPhone(details.phone)) found.phone = true
    if (delivery && !details.area.trim()) found.area = true
    if (delivery && !details.street.trim()) found.street = true
    if (details.notes.length > 1000) found.notes = true
    setErrors(found)
    setNotice(null)
    if (Object.keys(found).length > 0) {
      // Bring the first problem into view (the form is long on a phone).
      const first = Object.keys(found)[0]
      document.getElementById(`order-${first}`)?.focus()
      return
    }

    startSending(async () => {
      const result = await submitOrder({
        checkoutId,
        locale,
        ...details,
        website: honeypot,
        // Ids and quantities only: the server takes names and prices from the database.
        items: rows.map((r) => ({ productId: r.product.id, quantity: r.quantity })),
      }).catch(() => ({ ok: false as const, reason: 'error' as const }))

      if (result.ok) {
        clearCheckout()
        onDone(result.order)
        return
      }
      switch (result.reason) {
        case 'invalid':
          setErrors(Object.fromEntries(result.fields.map((f) => [f, true])))
          break
        case 'cartChanged':
          setNotice(c.cartChanged)
          onCartChanged()
          window.scrollTo({ top: 0 })
          break
        case 'rateLimited':
          setNotice(c.rateLimited)
          break
        default:
          setNotice(c.failed)
      }
    })
  }

  const input = (
    key: 'name' | 'area' | 'street' | 'building' | 'floor' | 'landmark',
    label: string,
    options: { autoComplete?: string; maxLength: number; hint?: string; error?: string } = {
      maxLength: 120,
    },
  ) => (
    <Field
      id={`order-${key}`}
      label={label}
      hint={options.hint}
      error={errors[key as OrderField] && options.error}
    >
      <input
        id={`order-${key}`}
        autoComplete={options.autoComplete}
        maxLength={options.maxLength}
        value={details[key]}
        onChange={(e) => set(key, e.target.value)}
        className={inputClass}
        {...describedBy(`order-${key}`, errors[key as OrderField], options.hint)}
      />
    </Field>
  )

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby="checkout-title"
      className="flex flex-col gap-6 rounded-card bg-paper p-5 shadow-soft lg:p-8"
    >
      <h2 id="checkout-title" className="display m-0 text-[1.75rem] lg:text-[2.25rem]">
        {c.title}
      </h2>

      {input('name', c.name, { autoComplete: 'name', maxLength: 80, error: c.errors.name })}
      <Field
        id="order-phone"
        label={c.phone}
        hint={formatNodes(t.booking.phoneHint, phoneExample)}
        error={errors.phone && formatNodes(t.booking.errors.phone, phoneExample)}
      >
        <input
          id="order-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          placeholder={PHONE_EXAMPLE}
          value={details.phone}
          onChange={(e) => set('phone', e.target.value)}
          className={`${inputClass} rtl:text-end`}
          {...describedBy('order-phone', errors.phone, t.booking.phoneHint)}
        />
      </Field>

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-2.5 p-0 text-sm font-semibold">{c.how}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['delivery', 'pickup'] as const).map((option) => (
            <label key={option} className={`${chipClass} cursor-pointer`}>
              <input
                type="radio"
                name="fulfillment"
                value={option}
                checked={details.fulfillment === option}
                onChange={() => set('fulfillment', option)}
                className="sr-only"
              />
              {option === 'delivery' ? c.delivery : c.pickup}
            </label>
          ))}
        </div>
      </fieldset>

      {delivery ? (
        <div key="delivery" className="motion-fade flex flex-col gap-5">
          {input('area', c.area, { autoComplete: 'address-level2', maxLength: 120, error: c.errors.area })}
          {input('street', c.street, { autoComplete: 'address-line1', maxLength: 160, error: c.errors.street })}
          <div className="grid grid-cols-2 gap-3">
            {input('building', c.building, { autoComplete: 'address-line2', maxLength: 120 })}
            {input('floor', c.floor, { maxLength: 40 })}
          </div>
          {input('landmark', c.landmark, { maxLength: 200, hint: c.landmarkHint })}
        </div>
      ) : (
        <div key="pickup" className="motion-fade flex flex-col gap-2 rounded-2xl bg-paper-bright px-4 py-3.5">
          <p className="m-0 text-[0.8125rem] font-semibold text-ink-soft">{c.pickupFrom}</p>
          <p className="m-0 text-[0.9375rem] leading-relaxed whitespace-pre-line">
            <IsolatePlaceholders text={shop.pickupLocation || c.pickupUnknown} />
          </p>
          {shop.mapLink && (
            <a
              href={shop.mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-clay underline decoration-1 underline-offset-4"
            >
              <Icon name="pin" size={16} /> {c.mapLink}
            </a>
          )}
        </div>
      )}

      <Field id="order-notes" label={c.notes} hint={c.notesHint} error={errors.notes && c.errors.notes}>
        <textarea
          id="order-notes"
          rows={2}
          maxLength={1000}
          value={details.notes}
          onChange={(e) => set('notes', e.target.value)}
          className={`${inputClass} py-3`}
          {...describedBy('order-notes', errors.notes, c.notesHint)}
        />
      </Field>

      {/* Honeypot: invisible to people, tempting to bots. Filled in = not saved. */}
      <div aria-hidden className="absolute size-px overflow-hidden opacity-0">
        <label>
          Website
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      <dl className="m-0 flex flex-col gap-2 border-t border-sand pt-5">
        <div className="flex items-baseline justify-between gap-4 text-[0.9375rem]">
          <dt>{t.cart.subtotal}</dt>
          <dd className="m-0 tabular-nums">{price(subtotal)}</dd>
        </div>
        {fee.kind !== 'none' && (
          <div className="flex items-baseline justify-between gap-4 text-[0.9375rem]">
            <dt>{c.deliveryFee}</dt>
            <dd className="m-0 text-end tabular-nums">
              {fee.kind === 'amount' ? price(fee.cents) : (
                <span className="text-ink-soft">{c.deliveryFeeOnWhatsApp}</span>
              )}
            </dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 pt-1">
          <dt className="font-semibold">{c.total}</dt>
          <dd className="m-0 text-[1.375rem] font-semibold tabular-nums">
            {fee.kind === 'onWhatsApp'
              ? formatNodes(c.totalPlusDelivery, { total: price(total) })
              : price(total)}
          </dd>
        </div>
      </dl>

      <p className="m-0 flex items-start gap-2.5 rounded-2xl bg-clay-mist px-4 py-3 text-sm font-semibold text-clay-deep">
        <Icon name="check" size={18} className="mt-0.5 shrink-0" />
        {c.cash}
      </p>

      {notice && <Notice>{notice}</Notice>}

      <button
        type="submit"
        disabled={sending}
        className="inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-full bg-clay px-6 text-[0.9375rem] font-semibold text-paper [transition:background-color_200ms_ease,scale_220ms_cubic-bezier(0.23,1,0.32,1)] hover:bg-clay-deep active:scale-[0.97] disabled:cursor-wait disabled:opacity-80"
      >
        {sending ? c.sending : c.submit}
        {!sending && <Icon name="arrow" size={18} />}
      </button>
      <p className="m-0 text-[0.8125rem] text-ink-soft">
        {c.pendingNote.replace('{name}', ownerName)}
      </p>
    </form>
  )
}
