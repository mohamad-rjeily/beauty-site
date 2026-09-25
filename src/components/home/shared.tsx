import type { ReactNode } from 'react'

/** Page container: 24px gutters on phones, 1200px measure on desktop. */
export const container = 'mx-auto w-full max-w-[75rem] px-6 lg:px-10'

/**
 * Headings from the admin mark their emphasis with stars: "Two crafts, one *hand.*".
 * Starred parts are set in italic (Arabic turns italics off globally and keeps the colour);
 * text without stars renders plain.
 */
export function Emphasis({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
          <em key={i} className={`italic ${className}`}>
            {part.slice(1, -1)}
          </em>
        ) : (
          part
        ),
      )}
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
