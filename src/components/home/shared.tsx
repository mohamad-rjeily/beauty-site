import type { ReactNode } from 'react'

/** Page container: 24px gutters on phones, 1200px measure on desktop. */
export const container = 'mx-auto w-full max-w-[75rem] px-6 lg:px-10'

/**
 * The approved design sets the last word of each heading in italic ("one *hand.*").
 * Owner-edited headings are plain text, so the emphasis is applied here. Arabic turns
 * italics off globally and keeps only the colour.
 */
export function EmphasizeLast({ text, className = '' }: { text: string; className?: string }) {
  const trimmed = text.trim()
  const cut = trimmed.lastIndexOf(' ')
  if (cut === -1) return <em className={`italic ${className}`}>{trimmed}</em>
  return (
    <>
      {trimmed.slice(0, cut)} <em className={`italic ${className}`}>{trimmed.slice(cut + 1)}</em>
    </>
  )
}

export function SectionHeading({
  id,
  children,
  className = '',
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <h2 id={id} className={`display m-0 text-[2.5rem] lg:text-[3.75rem] ${className}`}>
      {children}
    </h2>
  )
}

/** A quiet, honest empty state: what is coming, and a way to ask in the meantime. */
export function EmptyNote({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={`m-0 max-w-[34ch] text-[0.9375rem] leading-relaxed ${className}`}>{children}</p>
  )
}
