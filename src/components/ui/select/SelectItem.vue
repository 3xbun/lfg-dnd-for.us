<script setup>
import { inject, computed } from 'vue'

const props = defineProps({
  value: { type: [String, Number], required: true },
  disabled: { type: Boolean, default: false },
  class: { type: [String, Object, Array], default: '' },
})

const selectProps = inject('selectModelValue', {})
const updateValue = inject('selectUpdateValue', () => {})

const isSelected = computed(() => selectProps.modelValue === props.value)
</script>

<template>
  <div
    @click="!disabled && updateValue(value)"
    :class="[
      'flex cursor-default items-center gap-2 rounded-xl px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground',
      disabled && 'pointer-events-none opacity-50',
      props.class,
    ]"
  >
    <span class="flex size-4 items-center justify-center">
      <svg v-if="isSelected" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </span>
    <slot />
  </div>
</template>
