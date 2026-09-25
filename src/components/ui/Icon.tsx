import type { SVGProps } from 'react'

/**
 * One authored icon set: 24px grid, 1.5 stroke, round caps. Directional icons carry
 * `rtl:-scale-x-100` so they point the reading direction in Arabic.
 */
const paths = {
  arrow: <path d="M4 12h16M14 6l6 6-6 6" />,
  arrowUpEnd: <path d="M7 17L17 7M9 7h8v8" />,
  chevronStart: <path d="M15 6l-6 6 6 6" />,
  chevronEnd: <path d="M9 6l6 6-6 6" />,
  compare: <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />,
  bag: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  phone: (
    <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.3z" />
      <path d="M9 8.5c.3 3.3 3.2 6.2 6.5 6.5l1-1.6-2-1-1 .9c-1.1-.5-2.2-1.6-2.8-2.8l.9-1-1-2z" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  sparkle: <path d="M12 3l1.8 7.2L21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-1.8z" />,
} as const

export type IconName = keyof typeof paths

const directional: IconName[] = ['arrow', 'arrowUpEnd', 'chevronStart', 'chevronEnd']

export function Icon({
  name,
  size = 20,
  className = '',
  ...rest
}: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  const flip = directional.includes(name) ? 'rtl:-scale-x-100' : ''
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${flip} ${className}`}
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}

/** Filled five-point star for ratings. */
export function Star({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-4.5L5.5 21l2-7.5L2 9h7z" />
    </svg>
  )
}

/** The studio's triple-arch mark (after Lebanese triple-arch windows). */
export function ArchMark({ className = '' }: { className?: string }) {
  return (
    <svg
      width="56"
      height="28"
      viewBox="0 0 56 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
      className={className}
    >
      <path d="M2 27V14a8 8 0 0 1 16 0v13M20 27V12a8 8 0 0 1 16 0v15M38 27V14a8 8 0 0 1 16 0v13" />
    </svg>
  )
}
