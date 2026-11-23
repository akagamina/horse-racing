<script setup lang="ts">
import { computed } from 'vue'
import HorseRoster from '@/components/HorseRoster.vue'
import RaceControls from '@/components/RaceControls.vue'
import RaceTrack from '@/components/RaceTrack.vue'
import RoundProgram from '@/components/RoundProgram.vue'
import RoundResults from '@/components/RoundResults.vue'
import { createFixtureStore, STATE_SLUGS } from '@/showroom/fixtures'

defineProps<{ slug: string }>()
const store = createFixtureStore('race-board')
const activeIds = computed(() => new Set(store.currentRound?.entries.map((e) => e.horseId) ?? []))
const controlStates = STATE_SLUGS.map((slug) => ({ slug, store: createFixtureStore(slug) }))
</script>

<template>
  <div class="component-example" :data-slug="slug">
    <div v-if="slug === 'controls'" class="controls-grid">
      <figure v-for="item in controlStates" :key="item.slug" class="specimen">
        <RaceControls :status="item.store.status" :can-generate="item.store.canGenerate" />
        <figcaption>{{ item.slug }}</figcaption>
      </figure>
    </div>

    <HorseRoster v-else-if="slug === 'horse-roster'" class="fixed-panel" :horses="store.horses" :active-ids="activeIds" />

    <RaceTrack
      v-else-if="slug === 'race-track'"
      class="fixed-track"
      :round="store.currentRound"
      :horses-by-id="store.horsesById"
      :positions="store.positions"
      :started="true"
      :standings="store.standings"
    />

    <RoundProgram
      v-else-if="slug === 'round-program'"
      class="fixed-panel"
      :program="store.program"
      :horses-by-id="store.horsesById"
      :active-round="2"
    />

    <div v-else-if="slug === 'round-results'" class="results-pair">
      <RoundResults :results="[]" :horses-by-id="store.horsesById" />
      <RoundResults class="fixed-panel" :results="store.results" :horses-by-id="store.horsesById" />
    </div>
  </div>
</template>

<style scoped>
.controls-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
.specimen {
  margin: 0;
  padding: 1rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius-m);
}
.specimen figcaption {
  margin-top: 0.6rem;
  color: var(--muted);
  font-size: var(--step--1);
}
.fixed-panel {
  max-width: 34rem;
  max-height: 44rem;
}
.fixed-track {
  max-width: 34rem;
  height: 640px;
}
.results-pair {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 34rem));
  align-items: start;
}
</style>
