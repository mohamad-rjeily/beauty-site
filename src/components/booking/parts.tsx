import { useSyncExternalStore, type ReactNode, type Ref } from 'react'

import { Icon } from '@/components/ui/Icon'

/** A service as the booking page needs it (already translated and formatted on the server). */
export type BookableService = {
  id: number
  slug: string
  name: string
  category: 'makeup' | 'skincare'
  mode: 'slot' | 'request'
  price: string
  durationLabel: string
}

export type RequestDetails = {
  requestedDate: string
  locationType: '' | 'studio' | 'onLocation'
  locationAddress: string
  peopleCount: number
  wantsTrial: boolean
}

export type CustomerDetails = { name: string; phone: string; notes: string }

/** Text inputs: 48px tall, 16px text (no zoom on iPhone), soft corners, clay-deep when wrong. */
export const inputClass =
  'block min-h-12 w-full rounded-2xl border border-line bg-paper-bright px-4 text-base text-ink transition-colors duration-200 placeholder:text-ink-soft/70 hover:border-stone focus-visible:rounded-2xl focus-visible:border-ink aria-invalid:border-clay-deep'

/** Pill chips for a small choice (where, a day's times): ink when chosen. */
export const chipClass =
  'inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-paper-bright px-4 text-[0.9375rem] font-semibold text-ink transition-[background-color,border-color,color,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-ink active:scale-[0.97] aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper has-checked:border-ink has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-clay'

/** A labelled field with its hint or error, wired for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="m-0 text-[0.8125rem] font-semibold text-clay-deep">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="m-0 text-[0.8125rem] text-ink-soft">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/** aria props for an input inside <Field>. */
export const describedBy = (id: string, error: unknown, hint?: unknown) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
})

/** A message the customer must see (a taken time, a failed send). Read out when it appears. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="motion-fade m-0 rounded-2xl bg-clay-mist px-4 py-3 text-sm font-semibold text-clay-deep"
    >
      {children}
    </p>
  )
}

const noSubscription = () => () => {}

/**
 * False in the server HTML and until React has taken over the page, then true. The server
 * renders the open step (so it shows at once), but a choice made before React is running
 * would show on screen without reaching the form, so its controls wait until then.
 */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  )

type StepState = 'open' | 'done' | 'locked'

/**
 * One numbered step. Open: a paper card with its content. Done: one line with the choice and
 * a Change button. Locked (earlier steps first): a quiet title only.
 */
export function Step({
  n,
  label,
  title,
  state,
  summary,
  changeLabel,
  onChange,
  headingRef,
  children,
}: {
  n: number
  label: string
  title: string
  state: StepState
  summary?: ReactNode
  changeLabel: string
  onChange?: () => void
  headingRef?: Ref<HTMLHeadingElement>
  children?: ReactNode
}) {
  const hydrated = useHydrated()
  const badge =
    state === 'open'
      ? 'bg-clay text-paper'
      : state === 'done'
        ? 'bg-ink text-paper'
        : 'border border-stone text-stone'

  return (
    <li
      className={`rounded-card transition-colors duration-300 ${
        state === 'open' ? 'bg-paper p-5 shadow-soft lg:p-8' : 'px-5 py-4 lg:px-8'
      } ${state === 'done' ? 'bg-paper/60' : ''}`}
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${badge}`}
        >
          {state === 'done' ? <Icon name="check" size={18} /> : n}
        </span>
        <div className="flex min-w-0 grow flex-col">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className={`display m-0 scroll-mt-24 font-normal outline-none ${
              state === 'open' ? 'text-[1.75rem] lg:text-[2.25rem]' : 'text-[1.375rem]'
            } ${state === 'locked' ? 'text-ink-soft' : ''}`}
          >
            <span className="sr-only">{label}: </span>
            {title}
          </h2>
          {state === 'done' && summary && (
            <p className="m-0 mt-1 text-sm text-ink-soft">{summary}</p>
          )}
        </div>
        {state === 'done' && onChange && (
          <button
            type="button"
            onClick={onChange}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-clay hover:text-clay-deep"
          >
            {changeLabel}
            <span className="sr-only">: {title}</span>
          </button>
        )}
      </div>
      {state === 'open' && (
        // `disabled` on a fieldset disables every control inside it, until React is ready.
        <fieldset
          disabled={!hydrated}
          className="motion-step m-0 mt-6 flex min-w-0 flex-col gap-6 border-0 p-0"
        >
          {children}
        </fieldset>
      )}
    </li>
  )
}
