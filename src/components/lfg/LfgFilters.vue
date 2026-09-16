<script setup>
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { getOptions } from '@/api/lfg.js'
import { dayLabel } from '@/utils/day.js'

const { t } = useI18n()

const props = defineProps({
  modelValue: { type: Object, required: true },
})

const emit = defineEmits(['update:modelValue'])

/**
 * Choice lists come from /api/options (read from the NocoDB column metadata),
 * never a hardcoded array — a stale list offered systems the column does not
 * accept, so those filters silently returned nothing.
 */
const options = ref({})
const ALL = computed(() => t('home.all'))

onMounted(async () => {
  try {
    options.value = await getOptions()
  } catch (err) {
    console.error('Failed to load filter options', err)
  }
})

function set(key, value) {
  // an empty value clears the filter rather than filtering on ''
  emit('update:modelValue', { ...props.modelValue, [key]: value || null })
}
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-sm">{{ t('home.filters') }}</CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground">{{ t('home.gameSystem') }}</Label>
        <Select :model-value="modelValue.gameSystem" @update:model-value="set('gameSystem', $event)">
          <SelectTrigger class="h-8 text-xs" :placeholder="ALL" />
          <SelectContent>
            <SelectItem value="">{{ ALL }}</SelectItem>
            <SelectItem v-for="sys in options.game_system || []" :key="sys" :value="sys">
              {{ sys }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground">{{ t('home.playStyle') }}</Label>
        <Select :model-value="modelValue.playStyle" @update:model-value="set('playStyle', $event)" :get-label="v => v ? t('lfg.' + v.toLowerCase()) : ''">
          <SelectTrigger class="h-8 text-xs" :placeholder="ALL" />
          <SelectContent>
            <SelectItem value="">{{ ALL }}</SelectItem>
            <SelectItem v-for="v in options.play_style || []" :key="v" :value="v">
              {{ t('lfg.' + v.toLowerCase()) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground">{{ t('home.status') }}</Label>
        <Select :model-value="modelValue.status" @update:model-value="set('status', $event)" :get-label="v => v ? t('lfg.' + v.toLowerCase()) : ''">
          <SelectTrigger class="h-8 text-xs" :placeholder="ALL" />
          <SelectContent>
            <SelectItem value="">{{ ALL }}</SelectItem>
            <SelectItem v-for="v in options.status || []" :key="v" :value="v">
              {{ t('lfg.' + v.toLowerCase()) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground">{{ t('lfg.dayOfWeek') }}</Label>
        <Select :model-value="modelValue.dayOfWeek" @update:model-value="set('dayOfWeek', $event)" :get-label="v => dayLabel(t, v)">
          <SelectTrigger class="h-8 text-xs" :placeholder="ALL" />
          <SelectContent>
            <SelectItem value="">{{ ALL }}</SelectItem>
            <SelectItem v-for="v in options.day_of_week || []" :key="v" :value="v">{{ dayLabel(t, v) }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardContent>
  </Card>
</template>