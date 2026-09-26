'use client'

import { Icon } from '@/components/ui/Icon'
import { format, type Dictionary } from '@/i18n'
import type { BookingField } from '@/lib/booking'

import { chipClass, describedBy, Field, inputClass, type RequestDetails } from './parts'

export const MAX_PEOPLE = 50

/**
 * Step 2 for request services (bridal, events): the date of the occasion, where, how many
 * people and whether she wants a trial. No time: the owner sets it when she confirms.
 */
export function RequestFields({
  value,
  onChange,
  errors,
  today,
  ownerName,
  onContinue,
  t,
}: {
  value: RequestDetails
  onChange: (next: RequestDetails) => void
  errors: Partial<Record<BookingField, true>>
  today: string
  ownerName: string
  onContinue: () => void
  t: Dictionary
}) {
  const b = t.booking
  const set = <K extends keyof RequestDetails>(key: K, v: RequestDetails[K]) =>
    onChange({ ...value, [key]: v })
  const people = (n: number) => set('peopleCount', Math.min(MAX_PEOPLE, Math.max(1, n)))

  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 max-w-[40ch] font-display text-[1.1875rem] leading-snug font-light">
        {format(b.requestNote, { name: ownerName })}
      </p>

      <Field
        id="book-date"
        label={b.requestedDate}
        error={errors.requestedDate && b.errors.requestedDate}
      >
        <input
          id="book-date"
          type="date"
          min={today}
          required
          value={value.requestedDate}
          onChange={(e) => set('requestedDate', e.target.value)}
          className={`${inputClass} max-w-xs`}
          {...describedBy('book-date', errors.requestedDate)}
        />
      </Field>

      <fieldset
        className="m-0 flex flex-col gap-2 border-0 p-0"
        aria-describedby={errors.locationType ? 'book-where-error' : undefined}
      >
        <legend className="mb-1.5 p-0 text-sm font-semibold">{b.where}</legend>
        <div className="flex flex-wrap gap-2">
          {(['studio', 'onLocation'] as const).map((where) => (
            <label key={where} className={`${chipClass} cursor-pointer`}>
              <input
                type="radio"
                name="locationType"
                value={where}
                checked={value.locationType === where}
                onChange={() => set('locationType', where)}
                className="sr-only"
              />
              {b[where]}
            </label>
          ))}
        </div>
        {errors.locationType && (
          <p id="book-where-error" className="m-0 text-[0.8125rem] font-semibold text-clay-deep">
            {b.errors.locationType}
          </p>
        )}
      </fieldset>

      {value.locationType === 'onLocation' && (
        <div className="motion-fade">
          <Field
            id="book-address"
            label={b.address}
            hint={b.addressHint}
            error={errors.locationAddress && b.errors.locationAddress}
          >
            <textarea
              id="book-address"
              rows={2}
              maxLength={500}
              autoComplete="street-address"
              value={value.locationAddress}
              onChange={(e) => set('locationAddress', e.target.value)}
              className={`${inputClass} py-3`}
              {...describedBy('book-address', errors.locationAddress, b.addressHint)}
            />
          </Field>
        </div>
      )}

      <Field id="book-people" label={b.people} error={errors.peopleCount && b.errors.peopleCount}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => people(value.peopleCount - 1)}
            disabled={value.peopleCount <= 1}
            aria-label={b.fewerPeople}
            className="flex size-12 items-center justify-center rounded-full border border-line bg-paper-bright text-ink transition-colors hover:border-ink disabled:opacity-40 disabled:hover:border-line"
          >
            <Icon name="minus" size={18} />
          </button>
          <input
            id="book-people"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_PEOPLE}
            value={value.peopleCount}
            onChange={(e) => set('peopleCount', Number(e.target.value) || 1)}
            className={`${inputClass} w-20 text-center tabular-nums`}
            {...describedBy('book-people', errors.peopleCount)}
          />
          <button
            type="button"
            onClick={() => people(value.peopleCount + 1)}
            disabled={value.peopleCount >= MAX_PEOPLE}
            aria-label={b.morePeople}
            className="flex size-12 items-center justify-center rounded-full border border-line bg-paper-bright text-ink transition-colors hover:border-ink disabled:opacity-40 disabled:hover:border-line"
          >
            <Icon name="plus" size={18} />
          </button>
        </div>
      </Field>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[0.9375rem]">
        <input
          type="checkbox"
          checked={value.wantsTrial}
          onChange={(e) => set('wantsTrial', e.target.checked)}
          className="size-5 shrink-0 accent-clay"
        />
        {b.trial}
      </label>

      <button
        type="button"
        onClick={onContinue}
        className="inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 self-stretch rounded-full bg-ink px-6 text-[0.9375rem] font-semibold text-paper [transition:background-color_200ms_ease,scale_220ms_cubic-bezier(0.23,1,0.32,1)] hover:bg-earth active:scale-[0.97] sm:self-start"
      >
        {b.continue} <Icon name="arrow" size={18} />
      </button>
    </div>
  )
}
