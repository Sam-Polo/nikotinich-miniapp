import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../api'

export type CartItem = {
  product: Product
  qty: number
}

export type PromoApplied = {
  code: string
  discount: number
  productSlugs?: string[]
}

type CartStore = {
  items: CartItem[]
  promoApplied: PromoApplied | null
  referralBonusUsed: number

  addItem: (product: Product, qty?: number) => void
  removeItem: (slug: string) => void
  updateQty: (slug: string, qty: number) => void
  clearCart: () => void
  totalItems: () => number
  subtotal: () => number
  getQty: (slug: string) => number

  applyPromo: (promo: PromoApplied) => void
  clearPromo: () => void
  applyReferralBonus: (amount: number) => void
  clearReferralBonus: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      promoApplied: null,
      referralBonusUsed: 0,

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

      clearCart: () => set({ items: [], promoApplied: null, referralBonusUsed: 0 }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),

      subtotal: () => get().items.reduce((sum, i) => sum + i.product.display_price * i.qty, 0),

      // количество конкретного товара в корзине
      getQty: (slug) => get().items.find(i => i.product.slug === slug)?.qty ?? 0,

      applyPromo: (promo) => set({ promoApplied: promo }),
      clearPromo: () => set({ promoApplied: null }),

      applyReferralBonus: (amount) => set({ referralBonusUsed: amount }),
      clearReferralBonus: () => set({ referralBonusUsed: 0 })
    }),
    { name: 'cart' }
  )
)
