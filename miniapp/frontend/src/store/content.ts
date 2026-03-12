import { create } from 'zustand'
import { getContent } from '../api'
import type { ContentItem } from '../api'

type ContentStore = {
  contentItems: ContentItem[]
  loadContent: () => Promise<void>
  updateItemCounts: (id: string, counts: { likes: number; claps: number; dislikes: number }) => void
}

export const useContentStore = create<ContentStore>((set, get) => ({
  contentItems: [],

  loadContent: async () => {
    if (get().contentItems.length > 0) return
    try {
      const items = await getContent()
      set({ contentItems: items })
    } catch {
      set({ contentItems: [] })
    }
  },

  updateItemCounts: (id, counts) => {
    set((state) => ({
      contentItems: state.contentItems.map((i) =>
        i.id === id ? { ...i, likes: counts.likes, claps: counts.claps, dislikes: counts.dislikes } : i
      )
    }))
  }
}))
