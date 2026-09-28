'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import { Emphasis } from '@/components/home/shared'
import { Icon } from '@/components/ui/Icon'
import { formatNodes, Ltr } from '@/components/ui/Ltr'
import { PillLink } from '@/components/ui/Pill'
import type { Dictionary } from '@/i18n'
import { formatPhone, formatPrice } from '@/lib/format'
import { addressLine, buildOrderMessage, deliveryFee, type SavedOrder } from '@/lib/orderMessage'
import { whatsappHref } from '@/lib/whatsapp'

const price = (cents: number) => <Ltr>{formatPrice(cents, 'USD')}</Ltr>

/**
 * After sending: the order number, its status (pending until she confirms), and, as the main
 * action, the same order sent to her on WhatsApp (opened by the button, never automatically).
 * Everything shown comes from the order as the server saved it.
 */
export function OrderDone({
  order,
  ownerName,
  whatsappNumber,
  shopHref,
  rtl,
  t,
}: {
  order: SavedOrder
  ownerName: string
  whatsappNumber: string | null
  shopHref: string
  rtl: boolean
  t: Dictionary
}) {
  const c = t.checkout
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    heading.current?.scrollIntoView({ block: 'start' })
  }, [])

  const fee = deliveryFee(order.fulfillment, order.deliveryFeeCents)
  // Short rows (a product line, a price) sit on one line; long ones stack label above value.
  type Row = { label: string; value: ReactNode; stacked?: boolean }
  const rows: Row[] = [
    ...order.lines.map((l): Row => ({
      label: `${l.quantity} × ${l.name}`,
      value: price(l.lineCents),
    })),
    ...(fee.kind === 'amount' ? [{ label: c.deliveryFee, value: price(fee.cents) }] : []),
    ...(fee.kind === 'onWhatsApp'
      ? [
          {
            label: c.deliveryFee,
            value: <span className="font-normal text-ink-soft">{c.deliveryFeeOnWhatsApp}</span>,
          },
        ]
      : []),
    {
      label: c.total,
      value:
        fee.kind === 'onWhatsApp'
          ? formatNodes(c.totalPlusDelivery, { total: price(order.totalCents) })
          : price(order.totalCents),
    },
    order.fulfillment === 'delivery' && order.address
      ? {
          label: c.message.deliverTo,
          value: addressLine(order.address, c.message, rtl),
          stacked: true,
        }
      : { label: c.pickup, value: c.message.pickup, stacked: true },
    { label: c.message.name, value: order.name, stacked: true },
    { label: c.message.phone, value: <Ltr>{formatPhone(order.phone)}</Ltr>, stacked: true },
    ...(order.notes ? [{ label: c.message.notes, value: order.notes, stacked: true }] : []),
  ]

  return (
    <div className="motion-step grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="flex flex-col items-start gap-5 lg:col-span-6">
        <h2
          ref={heading}
          tabIndex={-1}
          className="display m-0 scroll-mt-24 text-[3rem] outline-none lg:text-[4.5rem]"
        >
          <Emphasis text={c.done} className="text-clay" />
        </h2>
        <p className="m-0 text-[0.9375rem]">
          {formatNodes(c.orderNumber, {
            number: (
              <bdi className="font-semibold tracking-[0.08em] tabular-nums">{order.number}</bdi>
            ),
          })}
        </p>
        <p className="m-0 inline-flex items-center gap-2 rounded-full bg-clay-mist px-3.5 py-1.5 text-[0.8125rem] font-semibold text-clay-deep">
          <Icon name="clock" size={16} />
          {c.pending.replace('{name}', ownerName)}
        </p>

        {whatsappNumber && (
          <div className="mt-2 flex w-full flex-col items-start gap-4">
            <p className="m-0 max-w-[30ch] font-display text-[1.375rem] leading-snug font-light lg:text-[1.75rem]">
              {c.whatsappLead.replace('{name}', ownerName)}
            </p>
            <PillLink
              href={whatsappHref(whatsappNumber, buildOrderMessage(order, c.message, rtl))}
              external
              variant="sage"
              className="w-full sm:w-auto"
            >
              <Icon name="whatsapp" size={20} /> {c.sendOnWhatsApp}
            </PillLink>
            <p className="m-0 text-[0.8125rem] text-ink-soft">{c.savedEither}</p>
          </div>
        )}

        <PillLink href={shopHref} variant="outline" className="mt-2">
          {c.keepShopping}
        </PillLink>
      </div>

      <dl className="m-0 flex flex-col self-start rounded-card bg-paper px-5 py-2 shadow-soft lg:col-span-5 lg:col-start-8 lg:px-7">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`border-t border-sand py-3.5 first:border-t-0 ${
              row.stacked ? 'flex flex-col gap-0.5' : 'flex items-baseline justify-between gap-4'
            }`}
          >
            <dt
              className={
                row.stacked ? 'text-[0.8125rem] text-ink-soft' : 'min-w-0 text-[0.9375rem]'
              }
            >
              {row.label}
            </dt>
            <dd
              className={`m-0 text-[0.9375rem] font-semibold tabular-nums ${
                row.stacked ? 'min-w-0 break-words' : 'shrink-0 text-end'
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
