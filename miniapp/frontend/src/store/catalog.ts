import { create } from 'zustand'
import { getCategories } from '../api'
import type { Category } from '../api'

type CatalogStore = {
  categories: Category[]
  loaded: boolean
  loading: boolean
  loadCategories: () => Promise<void>
}

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  categories: [],
  loaded: false,
  loading: false,

  loadCategories: async () => {
    const state = get()
    if (state.loaded || state.loading) return

    set({ loading: true })
    try {
      const categories = await getCategories()
      set({ categories, loaded: true })
    } catch {
      set({ categories: [], loaded: true })
    } finally {
      set({ loading: false })
    }
  }
}))

