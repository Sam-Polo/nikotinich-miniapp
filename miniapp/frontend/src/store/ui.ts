import { create } from 'zustand'

type UiStore = {
  hideBottomNav: boolean
  setHideBottomNav: (value: boolean) => void
}

export const useUiStore = create<UiStore>((set) => ({
  hideBottomNav: false,
  setHideBottomNav: (value: boolean) => set({ hideBottomNav: value })
}))

