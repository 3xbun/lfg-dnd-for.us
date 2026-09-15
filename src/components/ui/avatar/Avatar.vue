<script setup>
const props = defineProps({
  size: { type: String, default: 'default' },
  class: { type: [String, Object, Array], default: '' },
})

const sizes = {
  sm: 'size-6',
  default: 'size-8',
  lg: 'size-10',
}
</script>

<template>
  <span
    :class="[
      'relative flex shrink-0 select-none overflow-hidden rounded-full',
      sizes[size] || sizes.default,
      props.class,
    ]"
  >
    <slot />
  </span>
</template>
