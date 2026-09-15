<script setup>
import { useI18n } from 'vue-i18n'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

const { t } = useI18n()

defineProps({
  modelValue: { type: Object, required: true },
})

defineEmits(['update:modelValue'])

const gameSystems = [
  'D&D 5e', 'Pathfinder 2e', 'Call of Cthulhu', 'FATE',
  'World of Darkness', 'Shadowrun', 'Blades in the Dark',
  'Dungeon World', 'Cyberpunk RED', 'Other',
]
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-sm">{{ t('home.filters') }}</CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground">{{ t('home.gameSystem') }}</Label>
        <Select
          :model-value="modelValue.gameSystem"
          @update:model-value="$emit('update:modelValue', { ...modelValue, gameSystem: $event })"
        >
          <SelectTrigger class="h-8 text-xs" :placeholder="t('home.all')" />
          <SelectContent>
            <SelectItem v-for="sys in gameSystems" :key="sys" :value="sys">{{ sys }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground">{{ t('home.playStyle') }}</Label>
        <Select
          :model-value="modelValue.playStyle"
          @update:model-value="$emit('update:modelValue', { ...modelValue, playStyle: $event })"
        >
          <SelectTrigger class="h-8 text-xs" :placeholder="t('home.all')" />
          <SelectContent>
            <SelectItem value="Online">{{ t('lfg.online') }}</SelectItem>
            <SelectItem value="Offline">{{ t('lfg.offline') }}</SelectItem>
            <SelectItem value="Hybrid">{{ t('lfg.hybrid') }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground">{{ t('home.status') }}</Label>
        <Select
          :model-value="modelValue.status"
          @update:model-value="$emit('update:modelValue', { ...modelValue, status: $event })"
        >
          <SelectTrigger class="h-8 text-xs" :placeholder="t('home.all')" />
          <SelectContent>
            <SelectItem value="Open">{{ t('lfg.open') }}</SelectItem>
            <SelectItem value="Full">{{ t('lfg.full') }}</SelectItem>
            <SelectItem value="Closed">{{ t('lfg.closed') }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardContent>
  </Card>
</template>
