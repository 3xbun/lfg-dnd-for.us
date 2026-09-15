import { reactive } from 'vue'
import { me as fetchMe, logout as apiLogout } from '../api/lfg.js'

/**
 * Session state lives in a signed HttpOnly cookie set by the functions layer.
 * The browser cannot read it — we only ask the server who we are.
 */
const state = reactive({
  user: null,
  loaded: false,
})

export function useAuth() {
  function isLoggedIn() {
    return !!state.user
  }

  async function load() {
    state.user = await fetchMe()
    state.loaded = true
    return state.user
  }

  async function logout() {
    await apiLogout()
    state.user = null
  }

  function loginWithDiscord() {
    window.location.href = '/api/auth/login'
  }

  return { state, isLoggedIn, load, logout, loginWithDiscord }
}
