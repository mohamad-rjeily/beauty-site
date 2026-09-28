import type { UIFieldServerComponent } from 'payload'

import { Icon } from '@/components/ui/Icon'
import { formatPhone, formatPrice } from '@/lib/format'
import { whatsappHref } from '@/lib/whatsapp'
import type { Order } from '@/payload-types'

import { adminLang, formatOrderDate, statusLabel, type AdminLang } from './orderAdmin'

const LABELS = {
  en: {
    order: 'Order',
    orderedIn: { en: 'ordered in English', ar: 'ordered in Arabic' },
    delivery: 'Delivery',
    deliveryOnWhatsApp: 'To agree on WhatsApp',
    pickup: 'Pickup from the studio',
    total: 'Total',
    cash: 'Cash only, in US dollars.',
    customer: 'Customer',
    chat: 'Chat with the customer on WhatsApp',
    deliverTo: 'Deliver to',
    area: 'Area',
    street: 'Street',
    building: 'Building',
    floor: 'Floor',
    landmark: 'Landmark',
    notes: 'Customer notes',
  },
  ar: {
    order: 'الطلب',
    orderedIn: { en: 'الطلب بالإنجليزية', ar: 'الطلب بالعربية' },
    delivery: 'التوصيل',
    deliveryOnWhatsApp: 'تُتفق عليها على واتساب',
    pickup: 'استلام من الاستوديو',
    total: 'المجموع',
    cash: 'الدفع نقداً فقط، بالدولار الأميركي.',
    customer: 'العميلة',
    chat: 'تحدّثي مع العميلة على واتساب',
    deliverTo: 'التوصيل إلى',
    area: 'المنطقة',
    street: 'الشارع',
    building: 'المبنى',
    floor: 'الطابق',
    landmark: 'معلم قريب',
    notes: 'ملاحظات العميلة',
  },
} satisfies Record<AdminLang, unknown>

const money = (cents: number) => <bdi>{formatPrice(cents, 'USD')}</bdi>

/**
 * Top of an order in the admin: the whole order readable at a glance on a phone (products,
 * total, where it goes, who it is for), with a one-tap WhatsApp chat to the customer.
 * Read from the saved order, so it always shows what is stored, never unsaved edits.
 * Hidden while creating an order by hand (nothing is saved yet).
 */
export const OrderSummary: UIFieldServerComponent = async ({ id, req, i18n }) => {
  if (!id) return null
  const order: Order | null = await req.payload
    .findByID({ collection: 'orders', id, depth: 0, req, overrideAccess: false })
    .catch(() => null)
  if (!order) return null

  const lang = adminLang(i18n.language)
  const l = LABELS[lang]
  const isDelivery = order.fulfillment === 'delivery'
  const fee = order.deliveryFee?.amount
  const address = isDelivery
    ? (
        [
          [l.area, order.area],
          [l.street, order.street],
          [l.building, order.building],
          [l.floor, order.floor],
          [l.landmark, order.landmark],
        ] as const
      ).filter(([, value]) => value?.trim())
    : []

  return (
    <section className="order-summary" aria-label={`${l.order} ${order.orderNumber ?? ''}`}>
      <header className="order-summary__head">
        <p className="order-summary__title">
          {l.order} <bdi className="order-summary__number">{order.orderNumber}</bdi>
        </p>
        <span className={`order-status order-status--${order.status}`}>
          {statusLabel(order.status, lang)}
        </span>
        <p className="order-summary__when">
          <bdi>{formatOrderDate(order.createdAt, lang)}</bdi>
          {order.locale && ` · ${l.orderedIn[order.locale]}`}
        </p>
      </header>

      <dl className="order-summary__lines">
        {order.items.map((item) => (
          <div key={item.id ?? item.productName} className="order-summary__row">
            <dt>
              <bdi>{item.quantity}</bdi> × {item.productName}
            </dt>
            <dd>{typeof item.lineTotal?.amount === 'number' && money(item.lineTotal.amount)}</dd>
          </div>
        ))}
        <div className="order-summary__row">
          <dt>{isDelivery ? l.delivery : l.pickup}</dt>
          <dd className={isDelivery && typeof fee !== 'number' ? 'order-summary__soft' : ''}>
            {isDelivery ? (typeof fee === 'number' ? money(fee) : l.deliveryOnWhatsApp) : '—'}
          </dd>
        </div>
        <div className="order-summary__row order-summary__row--total">
          <dt>{l.total}</dt>
          <dd>{typeof order.total?.amount === 'number' && money(order.total.amount)}</dd>
        </div>
      </dl>
      <p className="order-summary__soft order-summary__cash">{l.cash}</p>

      <div className="order-summary__block">
        <p className="order-summary__label">{l.customer}</p>
        <p className="order-summary__name">{order.customerName}</p>
        <p dir="ltr" className="order-summary__phone">
          <a href={`tel:${order.phone}`}>{formatPhone(order.phone)}</a>
        </p>
        <a
          className="order-summary__whatsapp"
          href={whatsappHref(order.phone, '')}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="whatsapp" size={20} />
          {l.chat}
        </a>
      </div>

      {address.length > 0 && (
        <div className="order-summary__block">
          <p className="order-summary__label">{l.deliverTo}</p>
          <dl className="order-summary__address">
            {address.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {order.notes?.trim() && (
        <div className="order-summary__block">
          <p className="order-summary__label">{l.notes}</p>
          <p className="order-summary__notes">{order.notes}</p>
        </div>
      )}
    </section>
  )
}
