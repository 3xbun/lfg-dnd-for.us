<script setup>
const props = defineProps({
  class: { type: [String, Object, Array], default: '' },
})
</script>

<template>
  <span :class="['flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground text-sm', props.class]">
    <slot />
  </span>
</template>
