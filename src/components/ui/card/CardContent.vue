<script setup>
const props = defineProps({
  class: { type: [String, Object, Array], default: '' },
})
</script>

<template>
  <div :class="['px-6 pb-6', props.class]">
    <slot />
  </div>
</template>
