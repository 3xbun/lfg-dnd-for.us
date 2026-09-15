<script setup>
const props = defineProps({
  class: { type: [String, Object, Array], default: '' },
})
</script>

<template>
  <label
    :class="[
      'flex items-center gap-2 text-sm font-medium leading-none select-none',
      props.class,
    ]"
  >
    <slot />
  </label>
</template>
