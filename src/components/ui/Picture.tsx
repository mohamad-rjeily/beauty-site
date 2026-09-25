import Image from 'next/image'

import type { Photo } from '@/lib/cms/home'

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
    'bg-sand text-ink-soft [background-image:repeating-linear-gradient(135deg,rgb(214_203_187/.55)_0_10px,transparent_10px_20px)]',
  dark: 'bg-earth text-earth-soft [background-image:repeating-linear-gradient(135deg,rgb(247_242_234/.06)_0_12px,transparent_12px_24px)]',
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
  if (photo) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={{ objectPosition: photo.position }}
        />
      </div>
    )
  }

  return (
    <div
      role="img"
      aria-label={`${soon}: ${hint}`}
      className={`relative flex flex-col items-center justify-center gap-1.5 overflow-hidden p-3 text-center ${toneClass[tone]} ${className}`}
    >
      <Icon name="camera" size={22} className="opacity-70" />
      <span className="text-[0.625rem] font-semibold tracking-[0.16em] uppercase rtl:tracking-normal rtl:text-xs">
        {soon}
      </span>
      <span className="max-w-[14rem] text-xs leading-snug opacity-80">{hint}</span>
    </div>
  )
}
