<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import * as api from '../api/lfg.js'
import { useAuth } from '../stores/auth.js'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { load, loginWithDiscord } = useAuth()

const isEdit = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const form = ref({
  title: '',
  game_system: 'D&D 5e',
  description: '',
  play_style: 'Online',
  location: '',
  status: 'Open',
})

const gameSystems = [
  'D&D 5e', 'Pathfinder 2e', 'Call of Cthulhu', 'FATE',
  'World of Darkness', 'Shadowrun', 'Blades in the Dark',
  'Dungeon World', 'Cyberpunk RED', 'Other',
]

async function loadPost() {
  if (!route.params.id) return
  isEdit.value = true
  loading.value = true
  try {
    const post = await api.getListing(route.params.id)
    form.value = {
      title: post.title || '',
      game_system: post.game_system || 'D&D 5e',
      description: post.description || '',
      play_style: post.play_style || 'Online',
      location: post.location || '',
      status: post.status || 'Open',
    }
  } catch (err) {
    console.error('Failed to load post', err)
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  saving.value = true
  try {
    const record = { ...form.value }
    if (isEdit.value) {
      await api.updateListing(route.params.id, record)
      router.push(`/lfg/${route.params.id}`)
    } else {
      const result = await api.createListing(record)
      router.push(`/lfg/${result.Id}`)
    }
  } catch (err) {
    console.error('Failed to save post', err)
    error.value = err?.response?.data?.message || 'Save failed'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  // Writing requires a session; the API would 401 anyway, this is just UX.
  const user = await load()
  if (!user) {
    loginWithDiscord()
    return
  }
  loadPost()
})
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-8">
    <Button variant="outline" size="sm" class="mb-4" @click="router.back()">{{ t('common.back') }}</Button>

    <Card>
      <CardHeader>
        <CardTitle class="text-xl">{{ isEdit ? t('lfg.edit') : t('lfg.create') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="text-center text-muted-foreground py-8">{{ t('common.loading') }}</div>

        <form v-else @submit.prevent="handleSubmit" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <Label>{{ t('lfg.title') }} *</Label>
            <Input v-model="form.title" :placeholder="t('lfg.titlePlaceholder')" required />
          </div>

          <div class="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.gameSystem') }} *</Label>
              <Select v-model="form.game_system">
                <SelectTrigger />
                <SelectContent>
                  <SelectItem v-for="sys in gameSystems" :key="sys" :value="sys">{{ sys }}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.playStyle') }} *</Label>
              <Select v-model="form.play_style">
                <SelectTrigger />
                <SelectContent>
                  <SelectItem value="Online">{{ t('lfg.online') }}</SelectItem>
                  <SelectItem value="Offline">{{ t('lfg.offline') }}</SelectItem>
                  <SelectItem value="Hybrid">{{ t('lfg.hybrid') }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label>{{ t('lfg.description') }} *</Label>
            <Textarea v-model="form.description" :placeholder="t('lfg.descriptionPlaceholder')" rows="5" required />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label>{{ t('lfg.location') }}</Label>
            <Input v-model="form.location" :placeholder="t('lfg.locationPlaceholder')" />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label>{{ t('lfg.status') }}</Label>
            <Select v-model="form.status">
              <SelectTrigger />
              <SelectContent>
                <SelectItem value="Open">{{ t('lfg.open') }}</SelectItem>
                <SelectItem value="Full">{{ t('lfg.full') }}</SelectItem>
                <SelectItem value="Closed">{{ t('lfg.closed') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" @click="router.back()">{{ t('lfg.cancel') }}</Button>
            <Button type="submit" :disabled="saving">
              {{ saving ? t('common.loading') : t('lfg.save') }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
