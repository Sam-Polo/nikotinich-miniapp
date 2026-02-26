import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AppSettings } from '../api'

type UserStore = {
  user: User | null
  settings: AppSettings | null
  setUser: (user: User | null) => void
  setSettings: (s: AppSettings) => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      settings: null,
      setUser: (user) => set({ user }),
      setSettings: (settings) => set({ settings })
    }),
    { name: 'user-store' }
  )
)
