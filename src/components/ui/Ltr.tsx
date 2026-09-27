import { Fragment, type ReactNode } from 'react'

/**
 * Keeps a left-to-right piece ("$80", "03 123 456") whole inside Arabic text. Without it the
 * right-to-left layout can move the "$" to the other side, or reverse the groups of a number.
 */
export function Ltr({ children }: { children: ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>
}

/**
 * format() for JSX: "From {price}" + { price: <Ltr>$25</Ltr> } -> ["From ", <Ltr>$25</Ltr>].
 * Unknown placeholders are left as they are.
 */
export const formatNodes = (template: string, values: Record<string, ReactNode>): ReactNode[] =>
  template
    .split(/\{(\w+)\}/)
    .map((part, i) =>
      i % 2 === 1 ? <Fragment key={i}>{part in values ? values[part] : `{${part}}`}</Fragment> : part,
    )
