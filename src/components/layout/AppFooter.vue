<template>
  <footer class="border-t border-border py-6 text-center text-sm text-muted-foreground">
    <p>
      &copy; 2026 D&amp;D For Us. Built with <i class="fas fa-heart text-red-500"></i> for the Thai TTRPG community.
    </p>
    <p class="mt-1 text-xs opacity-70">v{{ version }}</p>
  </footer>
</template>

<script setup>
// Single source of truth: the version in package.json. Bump it there and the
// footer follows automatically — no more drifting hardcoded strings.
import pkg from '../../../package.json'

const version = pkg.version
</script>
