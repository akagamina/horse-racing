<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import RaceBoard from '@/components/RaceBoard.vue'
import { useRaceStore } from '@/stores/race'

const store = useRaceStore()

// Leaving the game freezes the race; Resume picks it up where it stopped.
onBeforeRouteLeave(() => {
  store.pause()
})

// Browsers throttle or stop animation frames in a hidden tab. Rather than let
// the race crawl or jump in the background, a hidden tab pauses it.
const pauseWhenHidden = () => {
  if (document.visibilityState === 'hidden') store.pause()
}
onMounted(() => document.addEventListener('visibilitychange', pauseWhenHidden))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', pauseWhenHidden))
</script>

<template>
  <RaceBoard :store="store" />
  <nav class="game-footer" aria-label="Project">
    <RouterLink to="/showroom">Open the showroom</RouterLink>
  </nav>
</template>

<style scoped>
.game-footer { padding: 0 1rem 1.25rem; font-size: var(--step--1); }
@media (min-width: 1180px) {
  .game-footer { position: fixed; right: 1rem; bottom: 0.4rem; padding: 0; z-index: 5; }
}
</style>
