<script setup>
import { inject, ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  class: { type: [String, Object, Array], default: '' },
  placeholder: { type: String, default: '' },
})

const selectProps = inject('selectModelValue', {})
const open = inject('selectOpen', ref(false))
const triggerRef = inject('selectTriggerRef', ref(null))

function toggle() {
  open.value = !open.value
}

function onClickOutside(e) {
  const dropdown = document.querySelector('[data-select-dropdown]')
  if (dropdown && !dropdown.contains(e.target) &&
      triggerRef.value && !triggerRef.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    @click="toggle"
    :class="[
      'flex h-8 w-full items-center justify-between gap-1.5 whitespace-nowrap rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none transition-[color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
      !selectProps.modelValue && 'text-muted-foreground',
      props.class,
    ]"
  >
    <span class="line-clamp-1">
      <slot>{{ selectProps.modelValue || placeholder }}</slot>
    </span>
    <svg class="size-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  </button>
</template>
