<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import * as api from '../api/lfg.js'
import { useAuth } from '../stores/auth.js'
import { displayLocation } from '../utils/location.js'
import { dayLabel } from '../utils/day.js'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

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

const notFound = ref(false)
const options = ref({})
const reportOpen = ref(false)
const reportReason = ref('')
const reportDetail = ref('')
const reporting = ref(false)
const reportDone = ref(false)
const reportError = ref('')

const statusVariant = { Open: 'success', Full: 'warning', Closed: 'destructive' }

const locationLabel = computed(() => {
  const style = (post.value?.play_style || '').toLowerCase()
  if (style === 'online') return t('lfg.platform')
  if (style === 'offline') return t('lfg.location')
  return t('lfg.platformLocation')
})

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
    if (err?.response?.status === 404) notFound.value = true
    else console.error('Failed to load post', err)
  } finally {
    loading.value = false
  }
}

async function openReport() {
  reportOpen.value = true
  reportDone.value = false
  reportError.value = ''
  if (!Object.keys(options.value).length) {
    try {
      options.value = await api.getOptions()
    } catch (err) {
      console.error('Failed to load report reasons', err)
    }
  }
}

async function submitReport() {
  if (!isLoggedIn()) {
    const user = await load()
    if (!user) return loginWithDiscord()
  }
  if (!reportReason.value) {
    reportError.value = t('report.pickReason')
    return
  }
  reporting.value = true
  reportError.value = ''
  try {
    await api.reportListing({
      listingId: route.params.id,
      reason: reportReason.value,
      detail: reportDetail.value,
    })
    reportDone.value = true
  } catch (err) {
    reportError.value = err?.response?.data?.message || t('common.error')
  } finally {
    reporting.value = false
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

    <Card v-else-if="notFound" class="mx-auto max-w-md">
      <CardContent class="py-10 text-center">
        <p class="text-lg font-medium mb-1">{{ t('lfg.notFoundTitle') }}</p>
        <p class="text-sm text-muted-foreground mb-5">{{ t('lfg.notFoundBody') }}</p>
        <Button size="sm" @click="router.push('/')">{{ t('lfg.browseGroups') }}</Button>
      </CardContent>
    </Card>

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

        <!-- everyone but the owner can flag a listing -->
        <Button v-else variant="ghost" size="sm" class="text-muted-foreground" @click="openReport">
          {{ t('report.cta') }}
        </Button>
      </div>

      <!-- report dialog -->
      <div
        v-if="reportOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="reportOpen = false"
      >
        <Card class="w-full max-w-md">
          <CardHeader class="pb-3">
            <CardTitle class="text-base">{{ t('report.title') }}</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-col gap-3">
            <template v-if="!reportDone">
              <p class="text-sm text-muted-foreground">{{ t('report.blurb') }}</p>

              <div class="flex flex-col gap-1.5">
                <Label class="text-xs">{{ t('report.reason') }}</Label>
                <Select v-model="reportReason">
                  <SelectTrigger :placeholder="t('report.pickReason')" />
                  <SelectContent>
                    <SelectItem v-for="r in options.report_reason || []" :key="r" :value="r">{{ r }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="flex flex-col gap-1.5">
                <Label class="text-xs">{{ t('report.detail') }}</Label>
                <Textarea v-model="reportDetail" rows="3" :placeholder="t('report.detailPlaceholder')" />
              </div>

              <p v-if="reportError" class="text-sm text-destructive">{{ reportError }}</p>

              <div class="flex justify-end gap-2">
                <Button variant="outline" size="sm" @click="reportOpen = false">{{ t('lfg.cancel') }}</Button>
                <Button size="sm" :disabled="reporting" @click="submitReport">
                  {{ reporting ? t('common.loading') : t('report.submit') }}
                </Button>
              </div>
            </template>

            <template v-else>
              <p class="text-sm text-green-500">{{ t('report.thanks') }}</p>
              <div class="flex justify-end">
                <Button size="sm" @click="reportOpen = false">{{ t('report.close') }}</Button>
              </div>
            </template>
          </CardContent>
        </Card>
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
              <Label class="text-xs text-muted-foreground uppercase">{{ locationLabel }}</Label>
              <span class="text-sm">{{ displayLocation(post.location) }}</span>
            </div>

            <div v-if="post.seats_total != null" class="flex items-center gap-2">
              <Label class="text-xs text-muted-foreground uppercase">{{ t('lfg.seats') }}</Label>
              <span class="text-sm">{{ post.seats_open ?? '—' }} / {{ post.seats_total }}</span>
            </div>

            <div v-if="post.day_of_week || post.start_time || post.end_time" class="flex items-center gap-2">
              <Label class="text-xs text-muted-foreground uppercase">{{ t('lfg.schedule') }}</Label>
              <span class="text-sm">
                {{ [post.day_of_week ? dayLabel(t, post.day_of_week) : '', (post.start_time || '').slice(0, 5), (post.end_time || '').slice(0, 5)].filter(Boolean).join(' – ') }}
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