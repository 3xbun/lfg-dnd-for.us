<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import * as api from '../api/lfg.js'
import LfgCard from '../components/lfg/LfgCard.vue'
import LfgFilters from '../components/lfg/LfgFilters.vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
const router = useRouter()

const posts = ref([])
const loading = ref(true)
const searchQuery = ref('')
const filters = ref({ gameSystem: null, playStyle: null, status: null, dayOfWeek: null, tags: null })

async function loadPosts() {
  loading.value = true
  try {
    // Filtering happens server-side (buildWhere in functions/api/listings.js),
    // so the browser never composes a NocoDB where-clause.
    const params = { sort: '-CreatedAt' }
    if (filters.value.gameSystem) params.game_system = filters.value.gameSystem
    if (filters.value.playStyle) params.play_style = filters.value.playStyle
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.dayOfWeek) params.day_of_week = filters.value.dayOfWeek
    if (filters.value.tags) params.tags = filters.value.tags
    if (searchQuery.value) params.search = searchQuery.value

    const result = await api.listListings(params)
    posts.value = result.records || []
  } catch (err) {
    console.error('Failed to load posts', err)
  } finally {
    loading.value = false
  }
}

let searchTimeout = null
function onSearch(e) {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchQuery.value = e.target.value
  }, 300)
}

watch(filters, loadPosts, { deep: true })
watch(searchQuery, loadPosts)

onMounted(loadPosts)
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-8">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-foreground mb-2">{{ t('home.title') }}</h1>
      <p class="text-muted-foreground mb-6">{{ t('home.subtitle') }}</p>
      
      <div class="flex flex-col items-center gap-2">
        <Button variant="outline" @click="router.push('/map')" class="gap-2">
          <i class="fa-solid fa-map-location-dot"></i>
          {{ t('home.findStores') }}
        </Button>
        <p class="text-xs text-muted-foreground">{{ t('home.findStoresDesc') }}</p>
      </div>
    </div>

    <div class="mb-6">
      <Input :placeholder="t('home.searchPlaceholder')" @input="onSearch" class="max-w-xl mx-auto" />
    </div>

    <div class="grid grid-cols-[220px_1fr] gap-6 items-start max-lg:grid-cols-1">
      <LfgFilters v-model="filters" />

      <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 max-md:grid-cols-1">
        <div v-if="loading" class="col-span-full text-center text-muted-foreground py-12">
          {{ t('common.loading') }}
        </div>

        <template v-else>
          <LfgCard v-for="post in posts" :key="post.Id" :post="post" />

          <div v-if="!posts.length" class="col-span-full text-center py-12">
            <p class="text-muted-foreground">{{ t('home.noPosts') }}</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
