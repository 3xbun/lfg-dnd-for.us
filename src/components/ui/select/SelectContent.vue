<script setup>
import { inject, ref, watch } from 'vue'

const open = inject('selectOpen', ref(false))
const triggerRef = inject('selectTriggerRef', ref(null))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      data-select-dropdown
      :style="{
        position: 'fixed',
        top: triggerRef ? triggerRef.getBoundingClientRect().bottom + 4 + 'px' : '0',
        left: triggerRef ? triggerRef.getBoundingClientRect().left + 'px' : '0',
        minWidth: triggerRef ? triggerRef.offsetWidth + 'px' : 'auto',
      }"
      class="z-50 max-h-72 overflow-auto rounded-2xl border border-border bg-popover p-1 shadow-lg"
    >
      <slot />
    </div>
  </Teleport>
</template>
