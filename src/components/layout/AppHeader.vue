<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../../stores/auth.js'
import { useTheme } from '../../stores/theme.js'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const { t, locale } = useI18n()
const { isLoggedIn, state, load, logout, loginWithDiscord } = useAuth()
const { state: theme, toggle: toggleTheme } = useTheme()

// The session is an HttpOnly cookie owned by the server — ask who we are on boot.
load()

function toggleLocale() {
  locale.value = locale.value === 'th' ? 'en' : 'th'
  localStorage.setItem('locale', locale.value)
}

// Minimal nav: logo (home) + theme/language toggles (everyone) + auth on the
// right. When signed in, the avatar is a menu button — clicking it reveals
// My Games + Logout.
const menuOpen = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  menuOpen.value = false
}

async function handleLogout() {
  closeMenu()
  await logout()
}

function avatarUrl() {
  return state.user?.avatar_url || null
}

// Close the dropdown on any click outside of it.
function onClickOutside(e) {
  if (menuOpen.value && !e.target.closest('[data-profile-menu]')) {
    closeMenu()
  }
}
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border bg-header/80 backdrop-blur-md">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
      <router-link to="/" class="flex shrink-0 items-center">
        <img src="/imgs/logo.png" alt="LFG DnD For Us" class="h-9 w-9 object-contain sm:h-10 sm:w-10" />
      </router-link>

      <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <!-- Theme + language: available to everyone, signed in or not -->
        <Button variant="ghost" size="sm" @click="toggleTheme" :title="theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          <i v-if="theme.isDark" class="fad fa-sun"></i>
          <i v-else class="fad fa-moon"></i>
        </Button>

        <Button variant="ghost" size="sm" @click="toggleLocale" class="font-bold">
          {{ locale === 'th' ? 'EN' : 'TH' }}
        </Button>

        <!-- Signed in: avatar opens a small menu (My Games / Logout) -->
        <div v-if="isLoggedIn()" data-profile-menu class="relative">
          <button
            type="button"
            class="rounded-full transition hover:ring-2 hover:ring-brand/40"
            :aria-expanded="menuOpen"
            :aria-label="t('nav.myGroups')"
            @click="toggleMenu"
          >
            <Avatar size="default">
              <AvatarImage v-if="avatarUrl()" :src="avatarUrl()" />
              <AvatarFallback class="bg-brand text-white text-xs">
                {{ (state.user?.username || 'U')[0].toUpperCase() }}
              </AvatarFallback>
            </Avatar>
          </button>

          <div
            v-if="menuOpen"
            class="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg"
          >
            <p class="truncate px-3 pb-1 pt-1.5 text-xs text-muted-foreground">
              {{ state.user?.username }}
            </p>
            <router-link
              to="/my"
              class="block px-3 py-2 text-sm hover:bg-muted"
              @click="closeMenu"
            >
              {{ t('nav.myGroups') }}
            </router-link>
            <button
              type="button"
              class="block w-full px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
              @click="handleLogout"
            >
              {{ t('nav.logout') }}
            </button>
          </div>
        </div>

        <!-- Signed out: Discord sign-in -->
        <Button
          v-else
          variant="default"
          size="sm"
          @click="loginWithDiscord"
          class="bg-[#5865F2] hover:bg-[#4752C4] text-white border-none px-2.5 sm:px-3"
        >
          Discord
        </Button>
      </div>
    </div>
  </header>
</template>
