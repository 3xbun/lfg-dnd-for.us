<script setup>
const props = defineProps({
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'default' },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
  class: { type: [String, Object, Array], default: '' },
})

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/80',
  outline: 'border border-border bg-transparent hover:bg-muted hover:text-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-muted hover:text-foreground',
  destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
  link: 'text-primary underline-offset-4 hover:underline',
}

const sizes = {
  default: 'h-8 px-3 text-sm',
  xs: 'h-6 px-2.5 text-xs',
  sm: 'h-7 px-3 text-sm',
  lg: 'h-9 px-4 text-sm',
  icon: 'size-8',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl font-medium transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50',
      variants[variant] || variants.default,
      sizes[size] || sizes.default,
      props.class,
    ]"
  >
    <slot />
  </button>
</template>
