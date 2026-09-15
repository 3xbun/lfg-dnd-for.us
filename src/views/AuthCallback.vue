<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../stores/auth.js'

const router = useRouter()
const route = useRoute()
const { load, state } = useAuth()

const errorKeys = {
  denied: 'auth.denied',
  missing_code: 'auth.error',
  bad_state: 'auth.error',
  error: 'auth.error',
}

onMounted(async () => {
  // The session arrives as an HttpOnly cookie, never as a URL parameter.
  await load()
  const authError = route.query.auth
  router.replace(authError ? { path: '/', query: { auth: authError } } : '/')
})
</script>

<template>
  <div class="flex items-center justify-center py-20">
    <p class="text-muted-foreground">Signing in with Discord...</p>
  </div>
</template>
