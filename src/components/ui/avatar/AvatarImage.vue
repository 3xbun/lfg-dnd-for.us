<script setup>
const props = defineProps({
  src: { type: String, required: true },
})
</script>

<template>
  <img
    :src="src"
    class="aspect-square size-full object-cover rounded-full"
  />
</template>
