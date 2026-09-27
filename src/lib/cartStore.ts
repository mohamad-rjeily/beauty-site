'use client'

import { useSyncExternalStore } from 'react'

import { addToCart, parseCart, setQuantity, type CartLine, type SeenProduct } from './cart'

/**
 * The cart in this browser: localStorage, shared by every tab (the `storage` event keeps
 * them in step). It holds product ids and quantities only. A second small map remembers the
 * name and price she last saw for each product (see readSeen); it is never sent anywhere
 * (the server prices every order itself).
 *
 * Every storage access is wrapped: private windows and blocked site data make it throw, and
 * the shop must still work (the cart then lasts until the tab closes).
 */
const CART_KEY = 'cart:v1'
const SEEN_KEY = 'cart:seen:v2'
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

/**
 * What she last saw of each product (name and price), remembered in this browser: the cart
 * uses it to name a product that was taken off sale and to show a price change as old -> new.
 */
export const readSeen = (): Record<number, SeenProduct> => {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '{}')
    if (!value || typeof value !== 'object') return {}
    const seen: Record<number, SeenProduct> = {}
    for (const [id, entry] of Object.entries(value)) {
      const { priceCents, name } = (entry ?? {}) as Partial<SeenProduct>
      if (/^\d+$/.test(id) && Number.isInteger(priceCents) && typeof name === 'string') {
        seen[Number(id)] = { priceCents: priceCents as number, name: name.slice(0, 200) }
      }
    }
    return seen
  } catch {
    return {}
  }
}

export const rememberSeen = (products: Record<number, SeenProduct>) => {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify({ ...readSeen(), ...products }))
  } catch {
    // Without storage, removed products get the generic message and price changes go unmentioned.
  }
}

export const cart = {
  /** The lines right now (outside React; components use useCart). */
  snapshot,
  /** Adds up to `limit` in total; returns how many were added (0: the cart holds them all). */
  add(productId: number, quantity: number, limit: number, seen: SeenProduct): number {
    const { lines, added } = addToCart(snapshot(), productId, quantity, limit)
    if (added > 0) {
      save(lines)
      rememberSeen({ [productId]: seen })
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
