import { defineStore } from 'pinia'

const STORAGE_KEY = 'easy-vocab-theme'

function loadDark(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'dark') return true
    if (v === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function applyDark(dark: boolean) {
  if (dark) document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
  localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
}

export const useThemeStore = defineStore('theme', {
  state: () => ({ darkMode: loadDark() }),

  actions: {
    init() {
      applyDark(this.darkMode)
    },
    toggle() {
      this.darkMode = !this.darkMode
      applyDark(this.darkMode)
    },
  },
})
