import type { DefaultServerCellComponentProps } from 'payload'

import type { Order } from '@/payload-types'

import { adminLang, statusLabel } from './orderAdmin'

/** Orders list: the status as a small coloured badge ("New" stands out: it needs her). */
export const OrderStatusCell = ({ cellData, i18n }: DefaultServerCellComponentProps) => {
  const status = cellData as Order['status'] | undefined
  if (!status) return null
  return (
    <span className={`order-status order-status--${status}`}>
      {statusLabel(status, adminLang(i18n.language))}
    </span>
  )
}
