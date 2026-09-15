<script setup>
import { provide, ref } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const triggerRef = ref(null)
const dropdownStyle = ref({})

provide('selectModelValue', props)
provide('selectUpdateValue', (val) => {
  emit('update:modelValue', val)
  open.value = false
})
provide('selectOpen', open)

function updateDropdownPosition() {
  if (triggerRef.value) {
    const rect = triggerRef.value.getBoundingClientRect()
    dropdownStyle.value = {
      position: 'fixed',
      top: rect.bottom + 4 + 'px',
      left: rect.left + 'px',
      minWidth: rect.width + 'px',
    }
  }
}

provide('selectTriggerRef', triggerRef)
provide('updateDropdownPosition', updateDropdownPosition)
</script>

<template>
  <div class="relative" :class="disabled && 'opacity-50 pointer-events-none'">
    <slot />
  </div>
</template>
