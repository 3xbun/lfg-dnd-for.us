import { reactive } from 'vue'

const STORAGE_KEY = 'theme'

const state = reactive({
  isDark: false,
})

function applyTheme() {
  document.documentElement.classList.toggle('dark', state.isDark)
}

function persist() {
  localStorage.setItem(STORAGE_KEY, state.isDark ? 'dark' : 'light')
}

function init() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    state.isDark = stored === 'dark'
  } else {
    state.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyTheme()
}

function toggle() {
  state.isDark = !state.isDark
  applyTheme()
  persist()
}

export function useTheme() {
  return { state, init, toggle }
}
