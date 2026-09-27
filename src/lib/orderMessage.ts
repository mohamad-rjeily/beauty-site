/**
 * The WhatsApp message that sends a saved order to the owner, and how the delivery fee reads.
 * Pure and browser-safe (unit-tested in orderMessage.test.ts). Everything in the message
 * comes from the order as the server saved it: its number, names, prices and total.
 */
import { formatPhone, formatPrice } from './format'

export type Fulfillment = 'delivery' | 'pickup'

/** An order as the server saved it, returned to the customer's page after checkout. */
export type SavedOrder = {
  number: string
  lines: { name: string; quantity: number; unitCents: number; lineCents: number }[]
  /** The fee copied from Site settings; null for pickup, or when no fee is set. */
  deliveryFeeCents: number | null
  totalCents: number
  fulfillment: Fulfillment
  address: { area: string; street: string; building: string; floor: string; landmark: string } | null
  name: string
  /** E.164, as saved ("+9613123456"). */
  phone: string
  notes: string
}

/**
 * The delivery fee line, wherever it shows (checkout summary, success screen, message):
 * - pickup: no fee line at all;
 * - delivery with a fee set: the amount, included in the total;
 * - delivery without a fee: "confirmed on WhatsApp", and the total says "+ delivery".
 */
export type DeliveryFee =
  | { kind: 'none' }
  | { kind: 'amount'; cents: number }
  | { kind: 'onWhatsApp' }

export const deliveryFee = (fulfillment: Fulfillment, feeCents: number | null): DeliveryFee =>
  fulfillment === 'pickup'
    ? { kind: 'none' }
    : feeCents === null
      ? { kind: 'onWhatsApp' }
      : { kind: 'amount', cents: feeCents }

export type OrderMessageLabels = {
  intro: string
  orderNumber: string
  deliveryFee: string
  deliveryFeeOnWhatsApp: string
  total: string
  totalPlusDelivery: string
  deliverTo: string
  floor: string
  near: string
  pickup: string
  name: string
  phone: string
  notes: string
  payment: string
}

/** "Area, Street, Building, Floor 3, near the pharmacy": only the parts she filled in. */
export const addressLine = (
  address: NonNullable<SavedOrder['address']>,
  labels: Pick<OrderMessageLabels, 'floor' | 'near'>,
  rtl: boolean,
): string =>
  [
    address.area,
    address.street,
    address.building,
    address.floor && labels.floor.replace('{floor}', address.floor),
    address.landmark && labels.near.replace('{landmark}', address.landmark),
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(rtl ? '، ' : ', ')

/**
 * The pre-filled message, in the customer's language (the labels decide it). Prices are
 * "$18"-style in both languages, with no direction marks: WhatsApp lays them out itself.
 */
export const buildOrderMessage = (order: SavedOrder, labels: OrderMessageLabels, rtl: boolean) => {
  const price = (cents: number) => formatPrice(cents, 'USD')
  const fee = deliveryFee(order.fulfillment, order.deliveryFeeCents)
  const address = order.address && addressLine(order.address, labels, rtl)

  return [
    labels.intro,
    '',
    labels.orderNumber.replace('{number}', order.number),
    ...order.lines.map((l) => `• ${l.quantity} × ${l.name}: ${price(l.lineCents)}`),
    ...(fee.kind === 'amount' ? [`${labels.deliveryFee}: ${price(fee.cents)}`] : []),
    ...(fee.kind === 'onWhatsApp' ? [labels.deliveryFeeOnWhatsApp] : []),
    fee.kind === 'onWhatsApp'
      ? labels.totalPlusDelivery.replace('{total}', price(order.totalCents))
      : `${labels.total}: ${price(order.totalCents)}`,
    '',
    order.fulfillment === 'delivery' && address ? `${labels.deliverTo}: ${address}` : labels.pickup,
    `${labels.name}: ${order.name}`,
    `${labels.phone}: ${formatPhone(order.phone)}`,
    ...(order.notes.trim() ? [`${labels.notes}: ${order.notes.trim()}`] : []),
    '',
    labels.payment,
  ].join('\n')
}
