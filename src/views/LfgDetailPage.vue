<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import * as api from '../api/lfg.js'
import { useAuth } from '../stores/auth.js'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { isLoggedIn, load, loginWithDiscord } = useAuth()

const post = ref(null)
const isOwner = ref(false)
const loading = ref(true)
const joining = ref(false)
const joinSuccess = ref(false)
const joinError = ref('')
const deleting = ref(false)

const links = ref({ facebook_url: '', discord_invite_url: '', discord_server_id: '' })
const linking = ref(false)
const linkError = ref('')
const linkSaved = ref(false)

const statusVariant = { Open: 'default', Full: 'secondary', Closed: 'destructive' }

async function loadPost() {
  try {
    const { record, isOwner: owner } = await api.getListingWithPermission(route.params.id)
    post.value = record
    isOwner.value = owner
    links.value = {
      facebook_url: record.facebook_url || '',
      discord_invite_url: record.discord_invite_url || '',
      discord_server_id: record.discord_server_id || '',
    }
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
    joinError.value = err?.response?.data?.message || t('common.error')
  } finally {
    joining.value = false
  }
}

async function handleSaveLinks() {
  linking.value = true
  linkError.value = ''
  linkSaved.value = false
  try {
    // '' clears a link; the server validates the host before storing it
    await api.linkListing({
      listingId: route.params.id,
      facebook_url: links.value.facebook_url || null,
      discord_invite_url: links.value.discord_invite_url || null,
      discord_server_id: links.value.discord_server_id || null,
    })
    linkSaved.value = true
    await loadPost()
  } catch (err) {
    linkError.value = err?.response?.data?.message || t('common.error')
  } finally {
    linking.value = false
  }
}

async function handleDelete() {
  if (!window.confirm(t('lfg.confirmDelete'))) return
  deleting.value = true
  try {
    await api.deleteListing(route.params.id)
    router.push('/my')
  } catch (err) {
    console.error('Failed to delete', err)
    deleting.value = false
  }
}

onMounted(loadPost)
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-8">
    <div v-if="loading" class="text-center text-muted-foreground py-12">{{ t('common.loading') }}</div>

    <template v-else-if="post">
      <div class="mb-6 flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" @click="router.back()">{{ t('common.back') }}</Button>

        <div v-if="isOwner" class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="router.push(`/lfg/${post.Id}/edit`)">
            {{ t('lfg.edit') }}
          </Button>
          <Button variant="destructive" size="sm" :disabled="deleting" @click="handleDelete">
            {{ t('lfg.delete') }}
          </Button>
        </div>
      </div>

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
                {{ [post.day_of_week, (post.start_time || '').slice(0, 5)].filter(Boolean).join(' ') }}
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

          <!-- owner: attach the Facebook post / Discord server -->
          <Card v-if="isOwner">
            <CardHeader class="pb-3">
              <CardTitle class="text-sm">{{ t('lfg.attachLinks') }}</CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-3">
              <div class="flex flex-col gap-1.5">
                <Label class="text-xs">{{ t('lfg.facebookUrl') }}</Label>
                <Input v-model="links.facebook_url" placeholder="https://www.facebook.com/..." />
              </div>
              <div class="flex flex-col gap-1.5">
                <Label class="text-xs">{{ t('lfg.discordInvite') }}</Label>
                <Input v-model="links.discord_invite_url" placeholder="https://discord.gg/..." />
              </div>
              <div class="flex flex-col gap-1.5">
                <Label class="text-xs">{{ t('lfg.discordServerId') }}</Label>
                <Input v-model="links.discord_server_id" placeholder="123456789012345678" />
              </div>

              <p v-if="linkError" class="text-sm text-destructive">{{ linkError }}</p>
              <p v-if="linkSaved" class="text-sm text-green-500">{{ t('lfg.linksSaved') }}</p>

              <Button size="sm" :disabled="linking" @click="handleSaveLinks">
                {{ linking ? t('common.loading') : t('lfg.saveLinks') }}
              </Button>
            </CardContent>
          </Card>

          <Card v-if="post.status === 'Open' && !isOwner">
            <CardHeader class="pb-3">
              <CardTitle class="text-sm">{{ t('lfg.join') }}</CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-3">
              <p v-if="joinSuccess" class="text-sm text-green-500">{{ t('lfg.joinSuccess') }}</p>
              <template v-else>
                <p class="text-sm text-muted-foreground">{{ t('lfg.applyMessage') }}</p>
                <p v-if="joinError" class="text-sm text-destructive">{{ joinError }}</p>
                <Button class="w-full" :disabled="joining" @click="handleJoin">
                  {{ isLoggedIn() ? t('lfg.applySend') : t('lfg.signInToJoin') }}
                </Button>
              </template>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>