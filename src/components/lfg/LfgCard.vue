<script setup>
import { useI18n } from 'vue-i18n'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const { t } = useI18n()

defineProps({
  post: { type: Object, required: true },
})

const statusVariant = {
  Open: 'default',
  Full: 'secondary',
  Closed: 'destructive',
}

const statusKeys = {
  Open: 'lfg.open',
  Full: 'lfg.full',
  Closed: 'lfg.closed',
}

const playStyleIcons = {
  Online: '&#x1F310;',
  Offline: '&#x1F3E0;',
  Hybrid: '&#x1F504;',
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
        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <span class="flex items-center gap-1">
            <span v-html="playStyleIcons[post.play_style] || '&#x1F3AE;'"></span>
            {{ t('lfg.' + (post.play_style?.toLowerCase() || 'online')) }}
          </span>
          <span v-if="post.location" class="truncate">{{ post.location }}</span>
        </div>
      </CardContent>
    </Card>
  </router-link>
</template>
