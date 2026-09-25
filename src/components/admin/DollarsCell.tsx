import type { DefaultCellComponentProps } from 'payload'

/** List-view column for money: shows cents as "$25.00". */
export const DollarsCell = ({ cellData }: DefaultCellComponentProps) => {
  const cents =
    typeof cellData === 'number'
      ? cellData
      : typeof cellData === 'object' && cellData && 'amount' in cellData
        ? (cellData as { amount?: unknown }).amount
        : null
  return <span>{typeof cents === 'number' ? `$${(cents / 100).toFixed(2)}` : '—'}</span>
}
