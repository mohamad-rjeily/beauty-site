import type { Media } from '@/payload-types'

/** A photo ready for next/image, or null when the owner hasn't uploaded one yet. */
export type Photo = { url: string; width: number; height: number; alt: string; position: string }

export const toPhoto = (media: number | Media | null | undefined): Photo | null => {
  if (!media || typeof media === 'number' || !media.url || !media.width || !media.height)
    return null
  const x = media.focalX ?? 50
  const y = media.focalY ?? 50
  return {
    url: media.url,
    width: media.width,
    height: media.height,
    alt: media.alt ?? '',
    position: `${x}% ${y}%`,
  }
}
