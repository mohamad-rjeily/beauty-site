import { MarqueeTrack } from '@/components/motion/MarqueeTrack'
import { Icon } from '@/components/ui/Icon'

/**
 * Slow strip of real service names (active services only). Hidden until there is at least one.
 * The list is rendered twice so the CSS loop is seamless; the copy is hidden from screen readers.
 */
export function ServicesMarquee({ names, label }: { names: string[]; label: string }) {
  if (names.length === 0) return null
  // Short lists repeat so one half is always wider than the screen.
  const items = Array.from({ length: Math.max(1, Math.ceil(8 / names.length)) }, () => names).flat()
  const duration = `${Math.max(28, items.length * 6)}s`

  const group = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="m-0 flex shrink-0 list-none items-center gap-6 p-0 pe-6 font-display text-[1.625rem] font-light whitespace-nowrap italic"
    >
      {items.map((name, i) => (
        <li key={i} className="flex items-center gap-6">
          <span>{name}</span>
          <Icon name="sparkle" size={14} className="fill-clay-tint stroke-none" />
        </li>
      ))}
    </ul>
  )

  return (
    <section
      aria-label={label}
      style={{ ['--marquee-duration' as string]: duration }}
      className="relative overflow-hidden bg-ink py-5 text-paper"
    >
      <MarqueeTrack className="motion-marquee flex w-max">
        {group(false)}
        {group(true)}
      </MarqueeTrack>
    </section>
  )
}
