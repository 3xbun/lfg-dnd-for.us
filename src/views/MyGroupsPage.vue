<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getMyListings } from '../api/lfg.js'
import { useAuth } from '../stores/auth.js'
import LfgCard from '../components/lfg/LfgCard.vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
const router = useRouter()
const { load, loginWithDiscord } = useAuth()

const mine = ref([])
const joined = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  const user = await load()
  if (!user) {
    loginWithDiscord()
    return
  }
  try {
    const data = await getMyListings()
    mine.value = data.mine || []
    joined.value = data.joined || []
  } catch (err) {
    error.value = err?.response?.data?.message || t('common.error')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-8">
    <div class="mb-6 flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-foreground">{{ t('my.title') }}</h1>
      <Button size="sm" @click="router.push('/lfg/create')">{{ t('nav.createPost') }}</Button>
    </div>

    <p v-if="error" class="text-sm text-destructive mb-4">{{ error }}</p>
    <div v-if="loading" class="text-center text-muted-foreground py-12">{{ t('common.loading') }}</div>

    <template v-else>
      <Card class="mb-6">
        <CardHeader class="pb-3">
          <CardTitle class="text-sm">{{ t('my.mine') }}</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="mine.length" class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 max-md:grid-cols-1">
            <LfgCard v-for="post in mine" :key="post.Id" :post="post" />
          </div>
          <p v-else class="text-sm text-muted-foreground">{{ t('my.noMine') }}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm">{{ t('my.joined') }}</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="joined.length" class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 max-md:grid-cols-1">
            <LfgCard v-for="post in joined" :key="post.Id" :post="post" />
          </div>
          <p v-else class="text-sm text-muted-foreground">{{ t('my.noJoined') }}</p>
        </CardContent>
      </Card>
    </template>
  </div>
</template>