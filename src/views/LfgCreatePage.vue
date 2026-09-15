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
const options = ref({})

const form = ref({
  title: '',
  game_system: '',
  description: '',
  play_style: '',
  location: '',
  status: 'Open',
  seats_total: null,
  seats_open: null,
  day_of_week: '',
  start_time: '',
  timezone: 'Asia/Bangkok',
})

async function loadPost() {
  if (!route.params.id) return
  isEdit.value = true
  loading.value = true
  try {
    const post = await api.getListing(route.params.id)
    form.value = {
      title: post.title || '',
      game_system: post.game_system || '',
      description: post.description || '',
      play_style: post.play_style || '',
      location: post.location || '',
      status: post.status || 'Open',
      seats_total: post.seats_total ?? null,
      seats_open: post.seats_open ?? null,
      day_of_week: post.day_of_week || '',
      start_time: (post.start_time || '').slice(0, 5),
      timezone: post.timezone || 'Asia/Bangkok',
    }
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to load listing'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  saving.value = true
  error.value = ''
  try {
    // send null rather than '' so NocoDB clears the column instead of
    // rejecting or storing an empty SingleSelect value
    const record = {}
    for (const [k, v] of Object.entries(form.value)) record[k] = v === '' ? null : v
    record.status = form.value.status || 'Open'

    if (isEdit.value) {
      await api.updateListing(route.params.id, record)
      router.push(`/lfg/${route.params.id}`)
    } else {
      const result = await api.createListing(record)
      router.push(`/lfg/${result.Id}`)
    }
  } catch (err) {
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
  try {
    options.value = await api.getOptions()
  } catch (err) {
    console.error('Failed to load options', err)
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
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <div class="flex flex-col gap-1.5">
            <Label>{{ t('lfg.title') }} *</Label>
            <Input v-model="form.title" :placeholder="t('lfg.titlePlaceholder')" required />
          </div>

          <div class="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.gameSystem') }} *</Label>
              <Select v-model="form.game_system">
                <SelectTrigger :placeholder="t('lfg.gameSystem')" />
                <SelectContent>
                  <SelectItem v-for="v in options.game_system || []" :key="v" :value="v">{{ v }}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.playStyle') }} *</Label>
              <Select v-model="form.play_style">
                <SelectTrigger :placeholder="t('lfg.playStyle')" />
                <SelectContent>
                  <SelectItem v-for="v in options.play_style || []" :key="v" :value="v">
                    {{ t('lfg.' + v.toLowerCase()) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label>{{ t('lfg.description') }} *</Label>
            <Textarea v-model="form.description" :placeholder="t('lfg.descriptionPlaceholder')" rows="5" required />
          </div>

          <div class="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.location') }}</Label>
              <Select v-model="form.location">
                <SelectTrigger :placeholder="t('lfg.location')" />
                <SelectContent>
                  <SelectItem v-for="v in options.location || []" :key="v" :value="v">{{ v }}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.status') }}</Label>
              <Select v-model="form.status">
                <SelectTrigger :placeholder="t('lfg.open')" />
                <SelectContent>
                  <SelectItem v-for="v in options.status || []" :key="v" :value="v">
                    {{ t('lfg.' + v.toLowerCase()) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4 max-md:grid-cols-1">
            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.dayOfWeek') }}</Label>
              <Select v-model="form.day_of_week">
                <SelectTrigger :placeholder="t('lfg.dayOfWeek')" />
                <SelectContent>
                  <SelectItem v-for="v in options.day_of_week || []" :key="v" :value="v">{{ v }}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.startTime') }}</Label>
              <Input v-model="form.start_time" type="time" />
            </div>

            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.timezone') }}</Label>
              <Input v-model="form.timezone" placeholder="Asia/Bangkok" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.seatsTotal') }}</Label>
              <Input v-model.number="form.seats_total" type="number" min="1" max="20" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.seatsOpen') }}</Label>
              <Input v-model.number="form.seats_open" type="number" min="0" max="20" />
            </div>
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