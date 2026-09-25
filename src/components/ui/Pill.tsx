import type { ReactNode } from 'react'

import { externalLinkProps } from '@/lib/links'

type Variant = 'clay' | 'ink' | 'outline' | 'outlineLight' | 'sage'

const variants: Record<Variant, string> = {
  clay: 'bg-clay text-paper hover:bg-clay-deep',
  ink: 'bg-ink text-paper hover:bg-earth',
  outline: 'border-[1.5px] border-ink text-ink hover:bg-ink hover:text-paper',
  outlineLight: 'border-[1.5px] border-paper/80 text-paper hover:bg-paper hover:text-ink',
  sage: 'bg-sage text-paper hover:bg-[#4d5946]',
}

/**
 * Pill-shaped link: the site's one action shape. At least 44px tall; external links
 * (WhatsApp, maps, Instagram) open in a new tab.
 */
export function PillLink({
  href,
  children,
  variant = 'clay',
  external = false,
  className = '',
  ariaLabel,
}: {
  href: string
  children: ReactNode
  variant?: Variant
  external?: boolean
  className?: string
  ariaLabel?: string
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      {...(external ? externalLinkProps : {})}
      className={`inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-full px-6 text-[0.9375rem] font-semibold no-underline [transition:background-color_200ms_ease,color_200ms_ease,transform_220ms_cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] active:[transition-duration:200ms,200ms,140ms] ${variants[variant]} ${className}`}
    >
      {children}
    </a>
  )
}
