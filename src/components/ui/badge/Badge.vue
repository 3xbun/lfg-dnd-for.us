<script setup>
const props = defineProps({
  variant: { type: String, default: 'default' },
  class: { type: [String, Object, Array], default: '' },
})

const variants = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive/10 text-destructive',
  outline: 'border border-border text-foreground',
}
</script>

<template>
  <span
    :class="[
      'inline-flex h-5 shrink-0 items-center gap-1 rounded-2xl border border-transparent px-2 py-0.5 text-xs font-medium',
      variants[variant] || variants.default,
      props.class,
    ]"
  >
    <slot />
  </span>
</template>
