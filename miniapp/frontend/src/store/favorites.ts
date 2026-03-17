import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../api'

type FavoritesStore = {
  items: Product[]
  toggle: (product: Product) => void
  isFavorite: (slug: string) => boolean
  clearAll: () => void
  pruneMissing: (existingSlugs: string[]) => void
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (product) => {
        set(state => {
          const exists = state.items.some(i => i.slug === product.slug)
          return {
            items: exists
              ? state.items.filter(i => i.slug !== product.slug)
              : [...state.items, product]
          }
        })
      },

      isFavorite: (slug) => get().items.some(i => i.slug === slug),

      clearAll: () => set({ items: [] }),

      pruneMissing: (existingSlugs: string[]) => {
        const setSlugs = new Set(existingSlugs)
        set(state => ({
          items: state.items.filter(i => setSlugs.has(i.slug))
        }))
      }
    }),
    { name: 'favorites' }
  )
)
