<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import * as api from '../api/lfg.js'
import { useAuth } from '../stores/auth.js'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { isLoggedIn, load, loginWithDiscord } = useAuth()

const post = ref(null)
const loading = ref(true)
const joining = ref(false)
const joinSuccess = ref(false)
const joinError = ref('')

const statusVariant = { Open: 'default', Full: 'secondary', Closed: 'destructive' }

async function loadPost() {
  try {
    post.value = await api.getListing(route.params.id)
  } catch (err) {
    console.error('Failed to load post', err)
  } finally {
    loading.value = false
  }
}

async function handleJoin() {
  if (!isLoggedIn()) {
    const user = await load()
    if (!user) {
      loginWithDiscord()
      return
    }
  }
  joining.value = true
  joinError.value = ''
  try {
    await api.joinListing(route.params.id)
    joinSuccess.value = true
    await loadPost()
  } catch (err) {
    joinError.value = err?.response?.data?.message || 'Join failed'
  } finally {
    joining.value = false
  }
}

onMounted(loadPost)
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-8">
    <div v-if="loading" class="text-center text-muted-foreground py-12">{{ t('common.loading') }}</div>

    <template v-else-if="post">
      <Button variant="outline" size="sm" class="mb-6" @click="router.back()">{{ t('common.back') }}</Button>

      <div class="grid grid-cols-[1fr_340px] gap-6 items-start max-lg:grid-cols-1">
        <Card>
          <CardHeader>
            <div class="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" class="text-brand border-brand/50">{{ post.game_system }}</Badge>
              <Badge :variant="statusVariant[post.status] || 'secondary'">
                {{ t('lfg.' + post.status?.toLowerCase()) }}
              </Badge>
              <Badge variant="secondary">{{ t('lfg.' + post.play_style?.toLowerCase()) }}</Badge>
            </div>
            <CardTitle class="text-2xl">{{ post.title }}</CardTitle>
          </CardHeader>

          <CardContent class="flex flex-col gap-4">
            <div v-if="post.location" class="flex items-center gap-2">
              <Label class="text-xs text-muted-foreground uppercase">{{ t('lfg.location') }}</Label>
              <span class="text-sm">{{ post.location }}</span>
            </div>

            <div v-if="post.seats_total != null" class="flex items-center gap-2">
              <Label class="text-xs text-muted-foreground uppercase">{{ t('lfg.seats') }}</Label>
              <span class="text-sm">{{ post.seats_open ?? '—' }} / {{ post.seats_total }}</span>
            </div>

            <div v-if="post.day_of_week || post.start_time" class="flex items-center gap-2">
              <Label class="text-xs text-muted-foreground uppercase">{{ t('lfg.schedule') }}</Label>
              <span class="text-sm">
                {{ [post.day_of_week, post.start_time].filter(Boolean).join(' ') }}
                <span v-if="post.timezone" class="text-muted-foreground">({{ post.timezone }})</span>
              </span>
            </div>

            <div>
              <Label class="text-xs text-muted-foreground uppercase">{{ t('lfg.description') }}</Label>
              <p class="text-sm mt-1 whitespace-pre-wrap text-foreground/80">{{ post.description }}</p>
            </div>
          </CardContent>
        </Card>

        <div class="flex flex-col gap-4">
          <Card v-if="post.facebook_url || post.discord_invite_url">
            <CardHeader class="pb-3">
              <CardTitle class="text-sm">{{ t('lfg.links') }}</CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-2">
              <a
                v-if="post.facebook_url"
                :href="post.facebook_url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-brand underline break-all"
              >
                {{ t('lfg.facebookPost') }}
              </a>
              <a
                v-if="post.discord_invite_url"
                :href="post.discord_invite_url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-brand underline break-all"
              >
                {{ t('lfg.discordServer') }}
              </a>
            </CardContent>
          </Card>

          <Card v-if="post.status === 'Open'">
            <CardHeader class="pb-3">
              <CardTitle class="text-sm">{{ t('lfg.join') }}</CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-3">
              <p v-if="joinSuccess" class="text-sm text-green-500">{{ t('lfg.joinSuccess') }}</p>
              <template v-else>
                <p class="text-sm text-muted-foreground">{{ t('lfg.applyMessage') }}</p>
                <p v-if="joinError" class="text-sm text-destructive">{{ joinError }}</p>
                <Button class="w-full" :disabled="joining" @click="handleJoin">
                  {{ isLoggedIn() ? t('lfg.applySend') : 'Discord' }}
                </Button>
              </template>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>
