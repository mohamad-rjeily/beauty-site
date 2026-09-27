'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'

import { getCartProducts } from '@/app/(frontend)/[lang]/cart/actions'
import { useHydrated } from '@/components/booking/parts'
import { EmptyNote } from '@/components/home/shared'
import { Icon } from '@/components/ui/Icon'
import { formatNodes, Ltr } from '@/components/ui/Ltr'
import { PillLink } from '@/components/ui/Pill'
import { Picture } from '@/components/ui/Picture'
import { plural, type Dictionary } from '@/i18n'
import type { Locale } from '@/i18n/config'
import {
  cartSubtotal,
  lineLimit,
  reconcileCart,
  type CartCheck,
  type CartNotice,
  type CartProduct,
  type CartRow,
} from '@/lib/cart'
import { cart, readSeen, rememberSeen, useCart } from '@/lib/cartStore'
import { formatPrice } from '@/lib/format'
import { productHref } from '@/lib/links'

const price = (cents: number) => <Ltr>{formatPrice(cents, 'USD')}</Ltr>

const stepButton =
  'flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-sand disabled:opacity-35 disabled:hover:bg-transparent'

/**
 * The cart: its lines with quantity steppers, and the subtotal. On opening it asks the
 * server for each product's current name, price and stock, fixes what changed (removed,
 * sold out, fewer left) and says so in plain words. Prices shown here are for her information:
 * the order is priced again on the server.
 */
export function CartView({
  locale,
  t,
  shopHref,
  children,
}: {
  locale: Locale
  t: Dictionary
  shopHref: string
  /** What follows the lines once the cart has something in it (the checkout). */
  children?: (rows: CartRow[]) => ReactNode
}) {
  const c = t.cart
  const hydrated = useHydrated()
  const lines = useCart()
  const [checks, setChecks] = useState<CartCheck[]>([])
  const [failed, setFailed] = useState(false)
  const [notices, setNotices] = useState<CartNotice[]>([])
  const [attempt, setAttempt] = useState(0)

  // Products the page hasn't checked yet: all of them on opening, a newly added one later.
  const unchecked = lines
    .map((l) => l.productId)
    .filter((id) => !checks.some((p) => p.id === id))
    .sort((a, b) => a - b)
    .join(',')

  useEffect(() => {
    if (!unchecked) return
    let live = true
    const ids = unchecked.split(',').map(Number)
    getCartProducts(ids, locale)
      .catch(() => ({ ok: false as const, reason: 'error' as const }))
      .then((result) => {
        if (!live) return
        if (!result.ok) {
          setFailed(true)
          return
        }
        setFailed(false)
        const fresh = [...checks.filter((p) => !ids.includes(p.id)), ...result.products]
        const current = cart.snapshot()
        const next = reconcileCart(current, fresh, readSeen())
        const changed =
          next.lines.length !== current.length ||
          next.lines.some((l, i) => l.quantity !== current[i]?.quantity)
        if (changed) cart.replace(next.lines)
        rememberSeen(
          Object.fromEntries(
            next.rows.map((r) => [r.product.id, { priceCents: r.product.priceCents, name: r.product.name }]),
          ),
        )
        setChecks(fresh)
        if (next.notices.length) setNotices((before) => [...before, ...next.notices])
      })
    return () => {
      live = false
    }
    // `checks` is read, not watched: only unchecked ids should trigger a new check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unchecked, locale, attempt])

  const rows: CartRow[] = lines.flatMap((line) => {
    const product = checks.find(
      (p): p is CartProduct => p.id === line.productId && p.available,
    )
    return product ? [{ product, quantity: line.quantity, lineCents: product.priceCents * line.quantity }] : []
  })
  const checking = hydrated && lines.length > 0 && rows.length < lines.length && !failed

  const noticeText = (n: CartNotice): ReactNode => {
    switch (n.kind) {
      case 'gone':
        return n.name ? c.gone.replace('{product}', n.name) : c.goneUnknown
      case 'outOfStock':
        return c.outOfStock.replace('{product}', n.name)
      case 'lowered':
        return c.lowered.replace('{product}', n.name).replaceAll('{n}', String(n.quantity))
      case 'priceChanged':
        return formatNodes(c.priceChangedFrom.replace('{product}', n.name), {
          old: price(n.oldCents),
          price: price(n.priceCents),
        })
    }
  }

  if (!hydrated) {
    return <div className="min-h-40" aria-busy="true" />
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Every change in one box, one short line each; read out when it appears. */}
      {notices.length > 0 && (
        <div
          role="alert"
          className="motion-fade rounded-2xl bg-clay-mist px-4 py-3 text-sm font-semibold text-clay-deep"
        >
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {notices.map((n, i) => (
              <li key={i}>{noticeText(n)}</li>
            ))}
          </ul>
        </div>
      )}

      {failed && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="m-0 text-[0.9375rem]">{c.checkFailed}</p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-ink px-5 text-sm font-semibold transition-colors hover:bg-ink hover:text-paper"
          >
            {c.retry}
          </button>
        </div>
      )}

      {lines.length === 0 ? (
        <div className="flex flex-col items-start gap-5">
          <EmptyNote className="text-ink-soft">{c.empty}</EmptyNote>
          <PillLink href={shopHref} variant="outline">
            {c.browse} <Icon name="arrow" size={18} />
          </PillLink>
        </div>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col rounded-card bg-paper px-4 shadow-soft lg:px-6">
            {rows.map((row) => (
              <CartLineItem key={row.product.id} row={row} locale={locale} t={t} />
            ))}
            {checking && (
              <li className="py-5 text-[0.9375rem] text-ink-soft" aria-live="polite">
                {c.checking}
              </li>
            )}
          </ul>

          {rows.length > 0 && (
            <div className="flex items-baseline justify-between gap-4 px-1">
              <p className="m-0 text-[0.9375rem]">
                {c.subtotal}{' '}
                <span className="text-ink-soft">
                  ({plural(c.items, rows.reduce((n, r) => n + r.quantity, 0), locale)})
                </span>
              </p>
              <p className="m-0 text-[1.375rem] font-semibold tabular-nums">
                {price(cartSubtotal(rows))}
              </p>
            </div>
          )}

          {rows.length > 0 && children?.(rows)}
        </>
      )}
    </div>
  )
}

function CartLineItem({ row, locale, t }: { row: CartRow; locale: Locale; t: Dictionary }) {
  const { product, quantity } = row
  const limit = lineLimit(product.stock)
  const c = t.cart
  const s = t.shopPage
  const href = productHref(locale, product.slug)
  return (
    <li className="flex gap-4 border-t border-sand py-4 first:border-t-0">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <Picture
          photo={product.photo}
          hint=""
          soon=""
          sizes="80px"
          className="h-24 w-20 rounded-t-full rounded-b-[0.375rem]"
        />
      </Link>
      <div className="flex min-w-0 grow flex-col gap-1">
        <Link
          href={href}
          className="display text-[1.1875rem] leading-[1.15] font-normal text-ink no-underline hover:text-clay-deep"
        >
          {product.name}
        </Link>
        <p className="m-0 text-[0.8125rem] text-ink-soft">
          {formatNodes(c.each, { price: price(product.priceCents) })}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div
            role="group"
            aria-label={`${s.quantity}: ${product.name}`}
            className="flex h-11 items-center rounded-full border border-line bg-paper-bright"
          >
            <button
              type="button"
              onClick={() =>
                quantity > 1 ? cart.setQuantity(product.id, quantity - 1) : cart.remove(product.id)
              }
              aria-label={quantity > 1 ? s.fewer : c.removeProduct.replace('{product}', product.name)}
              className={stepButton}
            >
              <Icon name="minus" size={16} />
            </button>
            <output className="w-6 text-center text-[0.9375rem] font-semibold tabular-nums">
              {quantity}
            </output>
            <button
              type="button"
              onClick={() => cart.setQuantity(product.id, Math.min(limit, quantity + 1))}
              disabled={quantity >= limit}
              aria-label={s.more}
              className={stepButton}
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
          <p className="m-0 text-[0.9375rem] font-semibold tabular-nums">{price(row.lineCents)}</p>
        </div>
        <button
          type="button"
          onClick={() => cart.remove(product.id)}
          className="-ms-1 inline-flex min-h-11 items-center self-start px-1 text-[0.8125rem] text-ink-soft underline decoration-1 underline-offset-4 hover:text-ink"
        >
          {c.remove}
          <span className="sr-only">: {product.name}</span>
        </button>
      </div>
    </li>
  )
}
