<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../../stores/auth.js'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { state, isLoggedIn, loginWithDiscord } = useAuth()

const hidden = computed(() => {
  const p = route.path
  return p === '/lfg/create' || /^\/lfg\/[^/]+\/edit$/.test(p)
})

function onClick() {
  if (state.loaded && isLoggedIn()) {
    router.push('/lfg/create')
  } else {
    loginWithDiscord()
  }
}
</script>

<template>
  <Button
    v-if="state.loaded && !hidden"
    @click="onClick"
    class="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center gap-2.5 rounded-2xl px-0 text-sm font-semibold shadow-lg shadow-brand/30 transition-transform hover:scale-105 sm:w-auto sm:px-5"
  >
    <i class="fad fa-plus text-base"></i>
    <span class="hidden sm:inline">{{ t('nav.createPost') }}</span>
  </Button>
</template>