<script setup>
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
        <router-link v-if="isLoggedIn()" to="/lfg/create">
          <Button variant="outline" size="sm" class="border-brand text-brand hover:bg-brand hover:text-white">
            {{ t('nav.createPost') }}
          </Button>
        </router-link>
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
