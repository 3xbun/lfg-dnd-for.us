<script setup>
const props = defineProps({
  class: { type: [String, Object, Array], default: '' },
})
</script>

<template>
  <div :class="['flex flex-col gap-1.5 px-6 pt-6', props.class]">
    <slot />
  </div>
</template>
