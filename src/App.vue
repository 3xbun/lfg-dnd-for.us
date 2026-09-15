<script setup>
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'
import FloatingCreateButton from './components/layout/FloatingCreateButton.vue'
</script>

<template>
  <div id="app-root">
    <AppHeader />
    <main class="main-content">
      <router-view />
    </main>
    <AppFooter />
    <FloatingCreateButton />
  </div>
</template>

<style scoped>
.main-content {
  min-height: calc(100vh - 64px - 60px);
}
</style>
