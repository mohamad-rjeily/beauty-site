'use client'

import { useSyncExternalStore } from 'react'

import { addToCart, parseCart, setQuantity, type CartLine } from './cart'

/**
 * The cart in this browser: localStorage, shared by every tab (the `storage` event keeps
 * them in step). It holds product ids and quantities only. A second small map remembers the
 * price she last saw for each product, so the cart can point out a price change; it is never
 * sent anywhere (the server prices every order itself).
 *
 * Every storage access is wrapped: private windows and blocked site data make it throw, and
 * the shop must still work (the cart then lasts until the tab closes).
 */
const CART_KEY = 'cart:v1'
const SEEN_KEY = 'cart:seen:v1'
/** Fired after something was added, so the header bag can bump. */
export const CART_ADDED_EVENT = 'cart:added'

let memory: string | null = null
const readRaw = (): string | null => {
  try {
    return window.localStorage.getItem(CART_KEY)
  } catch {
    return memory
  }
}
const writeRaw = (value: string) => {
  memory = value
  try {
    window.localStorage.setItem(CART_KEY, value)
  } catch {
    // Kept in memory only.
  }
}

// useSyncExternalStore needs the same array back while nothing changed.
const EMPTY: CartLine[] = []
let cache: { raw: string | null; lines: CartLine[] } = { raw: null, lines: EMPTY }
const snapshot = (): CartLine[] => {
  const raw = readRaw()
  if (raw !== cache.raw) cache = { raw, lines: raw ? parseCart(raw) : EMPTY }
  return cache.lines
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_KEY || event.key === null) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** The cart lines; empty on the server and until the page is running in the browser. */
export const useCart = (): CartLine[] => useSyncExternalStore(subscribe, snapshot, () => EMPTY)

const save = (lines: CartLine[]) => {
  writeRaw(JSON.stringify(lines))
  notify()
}

export const readSeenPrices = (): Record<number, number> => {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '{}')
    if (!value || typeof value !== 'object') return {}
    return Object.fromEntries(
      Object.entries(value).filter(
        ([id, cents]) => /^\d+$/.test(id) && Number.isInteger(cents) && (cents as number) >= 0,
      ),
    ) as Record<number, number>
  } catch {
    return {}
  }
}

export const rememberPrices = (prices: Record<number, number>) => {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify({ ...readSeenPrices(), ...prices }))
  } catch {
    // Without storage, price changes simply aren't pointed out.
  }
}

export const cart = {
  /** The lines right now (outside React; components use useCart). */
  snapshot,
  /** Adds up to `limit` in total; returns how many were added (0: the cart holds them all). */
  add(productId: number, quantity: number, limit: number, priceCents: number): number {
    const { lines, added } = addToCart(snapshot(), productId, quantity, limit)
    if (added > 0) {
      save(lines)
      rememberPrices({ [productId]: priceCents })
      window.dispatchEvent(new Event(CART_ADDED_EVENT))
    }
    return added
  },
  setQuantity(productId: number, quantity: number) {
    save(setQuantity(snapshot(), productId, quantity))
  },
  remove(productId: number) {
    save(setQuantity(snapshot(), productId, 0))
  },
  replace(lines: CartLine[]) {
    save(lines)
  },
  clear() {
    save([])
  },
}
