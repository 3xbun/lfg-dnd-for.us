<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../../stores/auth.js'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const { t, locale } = useI18n()
const { isLoggedIn, state, load, logout, loginWithDiscord } = useAuth()

// The session is an HttpOnly cookie owned by the server — ask who we are on boot.
load()

function toggleLocale() {
  locale.value = locale.value === 'th' ? 'en' : 'th'
  localStorage.setItem('locale', locale.value)
}

async function handleLogout() {
  await logout()
}

function avatarUrl() {
  return state.user?.avatar_url || null
}

/**
 * The nav destinations are always visible so people can see what the site does
 * before signing in. Signed out they render disabled, with a hover hint pointing
 * at the Discord sign-in button on the right.
 *
 * `state.loaded` gates the hint: before the session resolves we don't yet know
 * whether the visitor is signed in, and showing "sign in to..." to someone who
 * already is would be wrong.
 */
/**
 * Hover state is tracked in Vue rather than with a `group-hover:` utility:
 * Tailwind did not emit the group-hover rule, and the disabled <Button> has
 * `pointer-events: none` (so it cannot receive hover itself). Driving the hint
 * from mouseenter/mouseleave on the wrapper is deterministic.
 */
const hintVisible = ref(null)

function showHint(name) {
  if (!state.loaded || isLoggedIn()) return
  hintVisible.value = name
}
function hideHint() {
  hintVisible.value = null
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border bg-header/80 backdrop-blur-md">
    <div class="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
      <router-link to="/" class="flex items-center gap-2 text-brand font-bold text-lg whitespace-nowrap">
        <span class="text-2xl">&#x2694;</span>
        <span class="hidden sm:inline">LFG DnD For Us</span>
      </router-link>

      <nav class="flex flex-1 items-center gap-1">
        <router-link to="/">
          <Button variant="ghost" size="sm">{{ t('nav.home') }}</Button>
        </router-link>

        <!-- My Groups: always visible; disabled + hinted when signed out -->
        <span v-if="isLoggedIn()">
          <router-link to="/my">
            <Button variant="ghost" size="sm">{{ t('nav.myGroups') }}</Button>
          </router-link>
        </span>
        <!-- disabled controls do not receive hover/click events, so the hint
             and the cursor live on a wrapping span rather than the button -->
        <span
          v-else
          class="relative inline-block cursor-not-allowed"
          @mouseenter="showHint('groups')"
          @mouseleave="hideHint"
        >
          <Button variant="ghost" size="sm" disabled aria-disabled="true" class="opacity-40">
            {{ t('nav.myGroups') }}
          </Button>
          <span
            v-if="hintVisible === 'groups'"
            class="pointer-events-none absolute left-0 top-full z-50 mt-1 whitespace-nowrap rounded-xl border border-border bg-popover px-2.5 py-1.5 text-xs text-muted-foreground shadow-lg"
          >
            {{ t('nav.loginHintGroups') }}
          </span>
        </span>

        <!-- Create post: same treatment -->
        <span v-if="isLoggedIn()">
          <router-link to="/lfg/create">
            <Button variant="outline" size="sm" class="border-brand text-brand hover:bg-brand hover:text-white">
              {{ t('nav.createPost') }}
            </Button>
          </router-link>
        </span>
        <span
          v-else
          class="relative inline-block cursor-not-allowed"
          @mouseenter="showHint('create')"
          @mouseleave="hideHint"
        >
          <Button variant="outline" size="sm" disabled aria-disabled="true" class="opacity-40">
            {{ t('nav.createPost') }}
          </Button>
          <span
            v-if="hintVisible === 'create'"
            class="pointer-events-none absolute left-0 top-full z-50 mt-1 whitespace-nowrap rounded-xl border border-border bg-popover px-2.5 py-1.5 text-xs text-muted-foreground shadow-lg"
          >
            {{ t('nav.loginHintCreate') }}
          </span>
        </span>
      </nav>

      <div class="flex items-center gap-2">
        <Button variant="ghost" size="sm" @click="toggleLocale" class="font-bold">
          {{ locale === 'th' ? 'EN' : 'TH' }}
        </Button>

        <template v-if="isLoggedIn()">
          <Avatar size="sm">
            <AvatarImage v-if="avatarUrl()" :src="avatarUrl()" />
            <AvatarFallback class="bg-brand text-white text-xs">
              {{ (state.user?.username || 'U')[0].toUpperCase() }}
            </AvatarFallback>
          </Avatar>
          <span class="text-sm text-muted-foreground hidden sm:inline">{{ state.user?.username }}</span>
          <Button variant="outline" size="sm" @click="handleLogout">{{ t('nav.logout') }}</Button>
        </template>
        <template v-else>
          <Button variant="default" size="sm" @click="loginWithDiscord" class="bg-[#5865F2] hover:bg-[#4752C4] text-white border-none">
            Discord
          </Button>
        </template>
      </div>
    </div>
  </header>
</template>