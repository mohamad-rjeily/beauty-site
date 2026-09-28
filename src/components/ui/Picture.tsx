import Image from 'next/image'

import type { Photo } from '@/lib/cms/home'
import { previewEnabled } from '@/preview/enabled'

import { Icon } from './Icon'

type Tone = 'light' | 'dark'

type PictureProps = {
  photo: Photo | null
  /** What the photo should show; printed on the placeholder so the owner knows what to upload. */
  hint: string
  /** Placeholder label, e.g. "Photo coming soon". */
  soon: string
  sizes: string
  className?: string
  tone?: Tone
  priority?: boolean
}

const toneClass: Record<Tone, string> = {
  light:
    'bg-sand text-ink-soft [background-image:repeating-linear-gradient(135deg,color-mix(in_srgb,var(--color-line)_55%,transparent)_0_10px,transparent_10px_20px)]',
  dark: 'bg-earth text-earth-soft [background-image:repeating-linear-gradient(135deg,color-mix(in_srgb,var(--color-paper)_6%,transparent)_0_12px,transparent_12px_24px)]',
}

/**
 * A real photo from the admin, filling its frame; or, until one is uploaded, a clearly
 * marked placeholder that says what belongs there. Never a stock or generated image.
 */
export function Picture({
  photo,
  hint,
  soon,
  sizes,
  className = '',
  tone = 'light',
  priority,
}: PictureProps) {
  // The caller may position the frame (e.g. `absolute inset-0`); otherwise it is relative.
  const position = /(^|\s)(absolute|fixed)(\s|$)/.test(className) ? '' : 'relative'

  if (photo) {
    return (
      <div className={`${position} overflow-hidden ${className}`}>
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={{ objectPosition: photo.position }}
        />
        {/* PALETTE PREVIEW: covers the photo under ?photos=off (hidden otherwise, by CSS). */}
        {previewEnabled && (
          <Placeholder
            hint={hint}
            soon={soon}
            className={`photos-off-only absolute inset-0 ${toneClass[tone]}`}
          />
        )}
      </div>
    )
  }

  return (
    <Placeholder
      hint={hint}
      soon={soon}
      className={`${position} ${toneClass[tone]} ${className}`}
      label
    />
  )
}

function Placeholder({
  hint,
  soon,
  className,
  label,
}: {
  hint: string
  soon: string
  className: string
  /** Announce the placeholder as the image (off for the preview layer: the photo has its alt). */
  label?: boolean
}) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label ? `${soon}: ${hint}` : undefined}
      aria-hidden={label ? undefined : true}
      className={`flex flex-col items-center justify-center gap-1.5 overflow-hidden p-3 text-center ${className}`}
    >
      <Icon name="camera" size={22} className="opacity-70" />
      <span className="text-[0.625rem] font-semibold tracking-[0.16em] uppercase rtl:tracking-normal rtl:text-xs">
        {soon}
      </span>
      <span className="max-w-[14rem] text-xs leading-snug opacity-80">{hint}</span>
    </div>
  )
}
