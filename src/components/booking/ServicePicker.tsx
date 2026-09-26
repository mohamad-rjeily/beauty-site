import { Icon } from '@/components/ui/Icon'
import type { Dictionary } from '@/i18n'

import type { BookableService } from './parts'

const CATEGORIES = ['makeup', 'skincare'] as const

/**
 * Step 1: every bookable service, grouped by category, as one radio group. Each row shows
 * the price and duration; bridal and event services carry a "By request" badge. Each group
 * has an anchor (#book-makeup) that the home page's category cards link to.
 */
export function ServicePicker({
  services,
  selectedId,
  onSelect,
  t,
}: {
  services: BookableService[]
  selectedId: number | null
  onSelect: (service: BookableService) => void
  t: Dictionary
}) {
  const groups = CATEGORIES.map((category) => ({
    category,
    services: services.filter((s) => s.category === category),
  })).filter((g) => g.services.length > 0)

  return (
    <fieldset className="m-0 flex flex-col gap-7 border-0 p-0">
      <legend className="sr-only">{t.booking.steps.service}</legend>
      {groups.map((group) => (
        <div key={group.category} className="flex flex-col gap-2">
          <h3
            id={`book-${group.category}`}
            className="display m-0 scroll-mt-24 text-[1.375rem] text-ink-soft"
          >
            {t.categories[group.category]}
          </h3>
          <div className="flex flex-col">
            {group.services.map((service) => (
              <label
                key={service.id}
                className="group relative flex cursor-pointer items-center gap-4 border-t border-sand px-1 py-4 first:border-t-0 has-focus-visible:rounded-2xl has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-clay"
              >
                <input
                  type="radio"
                  name="service"
                  value={service.id}
                  checked={service.id === selectedId}
                  onChange={() => onSelect(service)}
                  className="peer sr-only"
                />
                <span className="flex min-w-0 grow flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="display text-[1.3125rem] leading-[1.15] font-normal lg:text-[1.5rem]">
                      {service.name}
                    </span>
                    <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">
                      {service.price}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink-soft">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="clock" size={16} />
                      <span className="sr-only">{t.duration}: </span>
                      {service.durationLabel}
                    </span>
                    {service.mode === 'request' && (
                      <span className="rounded-full bg-clay-mist px-2.5 py-0.5 text-[0.6875rem] font-semibold text-clay-deep rtl:text-xs">
                        {t.booking.requestBadge}
                      </span>
                    )}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-stone text-transparent transition-colors duration-200 group-hover:border-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper"
                >
                  <Icon name="check" size={14} />
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  )
}
