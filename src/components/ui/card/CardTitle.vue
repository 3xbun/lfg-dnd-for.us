<script setup>
const props = defineProps({
  class: { type: [String, Object, Array], default: '' },
})
</script>

<template>
  <div :class="['text-base font-medium', props.class]">
    <slot />
  </div>
</template>
