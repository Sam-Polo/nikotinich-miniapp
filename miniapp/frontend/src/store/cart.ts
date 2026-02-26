import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../api'

export type CartItem = {
  product: Product
  qty: number
}

type CartStore = {
  items: CartItem[]
  addItem: (product: Product, qty?: number) => void
  removeItem: (slug: string) => void
  updateQty: (slug: string, qty: number) => void
  clearCart: () => void
  totalItems: () => number
  subtotal: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, qty = 1) => {
        set(state => {
          const existing = state.items.find(i => i.product.slug === product.slug)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.product.slug === product.slug ? { ...i, qty: i.qty + qty } : i
              )
            }
          }
          return { items: [...state.items, { product, qty }] }
        })
      },

      removeItem: (slug) => {
        set(state => ({ items: state.items.filter(i => i.product.slug !== slug) }))
      },

      updateQty: (slug, qty) => {
        if (qty <= 0) {
          get().removeItem(slug)
          return
        }
        set(state => ({
          items: state.items.map(i => i.product.slug === slug ? { ...i, qty } : i)
        }))
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),

      subtotal: () => get().items.reduce((sum, i) => sum + i.product.display_price * i.qty, 0)
    }),
    { name: 'cart' }
  )
)
