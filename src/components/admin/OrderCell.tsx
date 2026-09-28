import Link from 'next/link'
import type { DefaultServerCellComponentProps } from 'payload'
import { formatAdminURL } from 'payload/shared'

import { formatPrice } from '@/lib/format'
import type { Order } from '@/payload-types'

import { adminLang, formatOrderDate } from './orderAdmin'

/**
 * First column of the orders list: everything she needs to recognise an order, stacked so it
 * fits a phone without scrolling sideways. Name (the link), then order number and total,
 * then date and delivery area (or pickup).
 */
export const OrderCell = ({ rowData, i18n, payload, link }: DefaultServerCellComponentProps) => {
  const order = rowData as Partial<Order> & { id: number }
  const lang = adminLang(i18n.language)
  const href = formatAdminURL({
    adminRoute: payload.config.routes.admin,
    path: `/collections/orders/${order.id}`,
  })
  const where =
    order.fulfillment === 'pickup'
      ? lang === 'ar'
        ? 'استلام'
        : 'Pickup'
      : [lang === 'ar' ? 'توصيل' : 'Delivery', order.area].filter(Boolean).join(' · ')

  const content = (
    <>
      <span className="order-cell__name">{order.customerName}</span>
      <span className="order-cell__meta">
        {order.orderNumber && <bdi className="order-cell__number">{order.orderNumber}</bdi>}
        {typeof order.total?.amount === 'number' && (
          <bdi className="order-cell__total">{formatPrice(order.total.amount, 'USD')}</bdi>
        )}
      </span>
      <span className="order-cell__meta">
        {order.createdAt && <bdi>{formatOrderDate(order.createdAt, lang)}</bdi>}
        <span>{where}</span>
      </span>
    </>
  )

  return link === false ? (
    <span className="order-cell">{content}</span>
  ) : (
    <Link href={href} className="order-cell">
      {content}
    </Link>
  )
}
