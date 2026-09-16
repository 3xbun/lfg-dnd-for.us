<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import * as api from '../api/lfg.js'
import { useAuth } from '../stores/auth.js'
import { displayLocation, locationsForStyle, locationMatches, prefixLocation } from '../utils/location.js'
import { dayLabel } from '../utils/day.js'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

const { t, locale } = useI18n()
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
  end_time: '',
})

// Optional links — people often post on Facebook / Discord *before* listing
// here, so these are attached during creation, not after.
const links = ref({
  facebook_url: '',
  discord_invite_url: '',
  discord_server_id: '',
})

const steps = [
  { key: 'stepBasics' },
  { key: 'stepDetails' },
  { key: 'stepSchedule' },
  { key: 'stepSettings' },
  { key: 'stepLinks' },
]
const step = ref(0)
const stepError = ref('')

const CUSTOM_LOCATION = '__custom__'
const customLocation = ref(false)

const locationLabel = computed(() => {
  const style = (form.value.play_style || '').toLowerCase()
  if (style === 'online') return t('lfg.platform')
  if (style === 'offline') return t('lfg.location')
  return t('lfg.platformLocation')
})

const filteredLocations = computed(() =>
  locationsForStyle(options.value.location || [], form.value.play_style)
    .sort((a, b) => displayLocation(a).localeCompare(displayLocation(b), locale.value))
)

// Selecting "Others" (อื่น ๆ) switches the field into free-text mode.
watch(() => form.value.location, (val) => {
  if (val === CUSTOM_LOCATION) {
    customLocation.value = true
    form.value.location = ''
  }
})

// If the user revisits step 1 and changes play_style, clear any stored
// location that no longer belongs to the newly chosen style.
watch(() => form.value.play_style, (style) => {
  if (customLocation.value) return
  const loc = form.value.location
  if (loc && !locationMatches(style, loc)) form.value.location = ''
})

// Jump back from custom text to the option list; keep the text if it maps to
// one of the choices, otherwise clear it.
function chooseFromOptions() {
  customLocation.value = false
  const typed = form.value.location
  if (!typed) return
  const match = filteredLocations.value.find((v) => displayLocation(v) === typed)
  form.value.location = match || ''
}

function circleClass(i) {
  if (i < step.value) return 'bg-brand text-white'
  if (i === step.value) return 'bg-brand/15 text-brand border border-brand'
  return 'bg-muted text-muted-foreground'
}

function labelClass(i) {
  if (i <= step.value) return 'text-foreground'
  return 'text-muted-foreground'
}

function validateStep() {
  const f = form.value
  let ok = true
  if (step.value === 0) ok = !!(f.title && f.game_system && f.play_style)
  if (step.value === 1) ok = !!f.description
  if (!ok) stepError.value = t('lfg.requiredFields')
  else stepError.value = ''
  return ok
}

function next() {
  if (!validateStep()) return
  step.value = Math.min(step.value + 1, steps.length - 1)
}

function prev() {
  step.value = Math.max(step.value - 1, 0)
  stepError.value = ''
}

function goTo(i) {
  if (i < step.value) {
    step.value = i
    stepError.value = ''
  } else if (i === step.value) {
    next()
  }
}

async function loadPost() {
  if (!route.params.id) return
  isEdit.value = true
  loading.value = true
  try {
    const post = await api.getListing(route.params.id)
    const loc = post.location || ''
    customLocation.value = !!loc && !(options.value.location || []).includes(loc)
    form.value = {
      title: post.title || '',
      game_system: post.game_system || '',
      description: post.description || '',
      play_style: post.play_style || '',
      location: customLocation.value ? displayLocation(loc) : loc,
      status: post.status || 'Open',
      seats_total: post.seats_total ?? null,
      seats_open: post.seats_open ?? null,
      day_of_week: post.day_of_week || '',
      start_time: (post.start_time || '').slice(0, 5),
      end_time: (post.end_time || '').slice(0, 5),
    }
    links.value = {
      facebook_url: post.facebook_url || '',
      discord_invite_url: post.discord_invite_url || '',
      discord_server_id: post.discord_server_id || '',
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
    // show the error in the right place — last step is where Save lives
    stepError.value = ''
    // send null rather than '' so NocoDB clears the column instead of
    // rejecting or storing an empty SingleSelect value
    const record = {}
    for (const [k, v] of Object.entries(form.value)) record[k] = v === '' ? null : v
    record.status = form.value.status || 'Open'
    record.location = prefixLocation(form.value.play_style, form.value.location)
    // Links (optional) — both the create and update endpoints accept them.
    for (const [k, v] of Object.entries(links.value)) record[k] = v === '' ? null : v

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

        <form v-else @submit.prevent="handleSubmit" class="flex flex-col gap-5">
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <div class="flex items-center" aria-label="Steps">
            <template v-for="(s, i) in steps" :key="s.key">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="i > step"
                  @click="goTo(i)"
                  :class="['flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all', circleClass(i)]"
                >
                  <i v-if="i < step" class="fad fa-check text-xs"></i>
                  <template v-else>{{ i + 1 }}</template>
                </button>
                <span class="hidden md:inline text-xs font-medium whitespace-nowrap" :class="labelClass(i)">
                  {{ t('lfg.' + s.key) }}
                </span>
              </div>
              <div
                v-if="i < steps.length - 1"
                class="mx-2 h-0.5 flex-1 rounded-full"
                :class="i < step ? 'bg-brand' : 'bg-border'"
              ></div>
            </template>
          </div>

          <p v-if="stepError" class="text-sm text-destructive">{{ stepError }}</p>

          <!-- Step 1: Basics -->
          <div v-show="step === 0" class="flex flex-col gap-4">
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
                <Select v-model="form.play_style" :get-label="v => v ? t('lfg.' + v.toLowerCase()) : ''">
                  <SelectTrigger :placeholder="t('lfg.playStyle')" />
                  <SelectContent>
                    <SelectItem v-for="v in options.play_style || []" :key="v" :value="v">
                      {{ t('lfg.' + v.toLowerCase()) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <!-- Step 2: Details -->
          <div v-show="step === 1" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.description') }} *</Label>
              <Textarea v-model="form.description" :placeholder="t('lfg.descriptionPlaceholder')" rows="5" required />
            </div>

            <div class="flex flex-col gap-1.5">
              <Label>{{ locationLabel }}</Label>
              <template v-if="customLocation">
                <div class="flex items-center gap-2">
                  <Input v-model="form.location" :placeholder="t('lfg.locationPlaceholder')" />
                  <Button type="button" variant="ghost" size="sm" class="shrink-0" @click="chooseFromOptions">
                    {{ t('lfg.changeLocation') }}
                  </Button>
                </div>
              </template>
              <template v-else>
                <Select v-model="form.location" :get-label="v => displayLocation(v)">
                  <SelectTrigger :placeholder="locationLabel" />
                  <SelectContent>
                    <SelectItem v-for="v in filteredLocations" :key="v" :value="v">{{ displayLocation(v) }}</SelectItem>
                    <div v-if="['online', 'offline'].includes(form.play_style.toLowerCase())" class="my-1 h-px bg-border"></div>
                    <SelectItem v-if="['online', 'offline'].includes(form.play_style.toLowerCase())" :value="CUSTOM_LOCATION">
                      <i class="fad fa-pen-to-square mr-1.5 text-xs"></i>{{ t('lfg.others') }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </template>
            </div>
          </div>

          <!-- Step 3: Schedule -->
          <div v-show="step === 2" class="flex flex-col gap-4">
            <div class="grid grid-cols-3 gap-4 max-md:grid-cols-1">
              <div class="flex flex-col gap-1.5">
                <Label>{{ t('lfg.dayOfWeek') }}</Label>
                <Select v-model="form.day_of_week" :get-label="v => dayLabel(t, v)">
                  <SelectTrigger :placeholder="t('lfg.dayOfWeek')" />
                  <SelectContent>
                    <SelectItem v-for="v in options.day_of_week || []" :key="v" :value="v">{{ dayLabel(t, v) }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="flex flex-col gap-1.5">
                <Label>{{ t('lfg.startTime') }}</Label>
                <Input v-model="form.start_time" type="time" />
              </div>

              <div class="flex flex-col gap-1.5">
                <Label>{{ t('lfg.endTime') }}</Label>
                <Input v-model="form.end_time" type="time" />
              </div>
            </div>
          </div>

          <!-- Step 4: Settings -->
          <div v-show="step === 3" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.status') }}</Label>
              <Select v-model="form.status" :get-label="v => v ? t('lfg.' + v.toLowerCase()) : ''">
                <SelectTrigger :placeholder="t('lfg.open')" />
                <SelectContent>
                  <SelectItem v-for="v in options.status || []" :key="v" :value="v">
                    {{ t('lfg.' + v.toLowerCase()) }}
                  </SelectItem>
                </SelectContent>
              </Select>
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
          </div>

          <!-- Step 5: Links (optional) -->
          <div v-show="step === 4" class="flex flex-col gap-4">
            <p class="text-sm text-muted-foreground">{{ t('lfg.linksHint') }}</p>
            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.facebookUrl') }}</Label>
              <Input v-model="links.facebook_url" placeholder="https://www.facebook.com/..." />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.discordInvite') }}</Label>
              <Input v-model="links.discord_invite_url" placeholder="https://discord.gg/..." />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label>{{ t('lfg.discordServerId') }}</Label>
              <Input v-model="links.discord_server_id" placeholder="123456789012345678" />
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" @click="prev" :disabled="step === 0">
              {{ t('common.back') }}
            </Button>

            <div class="flex gap-2">
              <Button type="button" variant="ghost" size="sm" @click="router.back()">{{ t('lfg.cancel') }}</Button>
              <Button v-if="step < steps.length - 1" type="button" size="sm" @click="next">
                {{ t('lfg.next') }}
              </Button>
              <Button v-else type="submit" size="sm" :disabled="saving">
                {{ saving ? t('common.loading') : t('lfg.save') }}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>