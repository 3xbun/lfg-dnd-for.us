<script setup>
const props = defineProps({
  class: { type: [String, Object, Array], default: '' },
})
</script>

<template>
  <div :class="['rounded-2xl border border-border bg-card text-card-foreground shadow-sm', props.class]">
    <slot />
  </div>
</template>
