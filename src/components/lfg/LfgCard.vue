<script setup>
import { useI18n } from 'vue-i18n'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { displayLocation } from '../../utils/location.js'

const { t } = useI18n()

defineProps({
  post: { type: Object, required: true },
})

const statusVariant = {
  Open: 'success',
  Full: 'warning',
  Closed: 'destructive',
}

const statusKeys = {
  Open: 'lfg.open',
  Full: 'lfg.full',
  Closed: 'lfg.closed',
}

const playStyleIcons = {
  Online: '<i class="fad fa-globe"></i>',
  Offline: '<i class="fad fa-house"></i>',
  Hybrid: '<i class="fad fa-arrows-rotate"></i>',
}
const defaultPlayStyleIcon = '<i class="fad fa-gamepad"></i>'

function tagsForPost(post) {
  const value = post.tags
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value || '').split(',').map((tag) => tag.trim()).filter(Boolean)
}
</script>

<template>
  <router-link :to="`/lfg/${post.Id}`" class="block group">
    <Card class="transition-all duration-200 group-hover:border-brand group-hover:shadow-lg group-hover:shadow-brand/10">
      <CardHeader class="pb-2">
        <div class="flex items-center justify-between">
          <Badge variant="outline" class="text-brand border-brand/50">
            {{ post.game_system }}
          </Badge>
          <Badge :variant="statusVariant[post.status] || 'secondary'" class="text-xs">
            {{ t(statusKeys[post.status] || 'lfg.open') }}
          </Badge>
        </div>
        <CardTitle class="text-base mt-2 line-clamp-2">{{ post.title }}</CardTitle>
      </CardHeader>

      <CardContent>
        <div v-if="tagsForPost(post).length" class="flex flex-wrap gap-1.5 mb-3">
          <Badge v-for="tag in tagsForPost(post)" :key="tag" variant="secondary" class="text-xs">
            {{ tag }}
          </Badge>
        </div>
        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <span class="flex items-center gap-1">
            <span v-html="playStyleIcons[post.play_style] || defaultPlayStyleIcon"></span>
            {{ t('lfg.' + (post.play_style?.toLowerCase() || 'online')) }}
          </span>
          <span v-if="post.location" class="truncate">{{ displayLocation(post.location) }}</span>
        </div>
      </CardContent>
    </Card>
  </router-link>
</template>
