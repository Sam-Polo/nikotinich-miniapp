import { create } from 'zustand'
import { getContent } from '../api'
import type { ContentItem } from '../api'

export type UserReactionState = { like: number; clap: number; dislike: number }

type ContentStore = {
  contentItems: ContentItem[]
  userReactions: Record<string, UserReactionState>
  loadContent: () => Promise<void>
  updateItemCounts: (id: string, counts: { likes: number; claps: number; dislikes: number }) => void
  setUserReaction: (id: string, reaction: UserReactionState) => void
  mergeUserReactions: (reactions: Record<string, UserReactionState>) => void
}

export const useContentStore = create<ContentStore>((set, get) => ({
  contentItems: [],
  userReactions: {},

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
  },

  setUserReaction: (id, reaction) => {
    set((state) => ({
      userReactions: { ...state.userReactions, [id]: reaction }
    }))
  },

  mergeUserReactions: (reactions) => {
    if (!reactions || Object.keys(reactions).length === 0) return
    set((state) => ({
      userReactions: { ...state.userReactions, ...reactions }
    }))
  }
}))
