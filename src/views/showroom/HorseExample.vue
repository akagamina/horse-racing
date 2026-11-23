<script setup lang="ts">
import { computed } from 'vue'
import HorseBadge from '@/components/HorseBadge.vue'
import HorseCanvas from '@/components/HorseCanvas.vue'
import { createFixtureStore } from '@/showroom/fixtures'
import { FIXTURE_HORSES } from '@/showroom/manifest'
import { coatFor } from '@/three/horseModel'

const props = defineProps<{ horseId: string }>()
const horse = computed(() => FIXTURE_HORSES.find((h) => h.id === props.horseId)!)
const program = createFixtureStore('ready').program ?? []
const rounds = computed(() =>
  program.flatMap((round) => {
    const entry = round.entries.find((e) => e.horseId === props.horseId)
    return entry ? [{ round: round.number, distance: round.distance, lane: entry.lane }] : []
  }),
)
const index = computed(() => FIXTURE_HORSES.findIndex((h) => h.id === props.horseId))
const prev = computed(() => FIXTURE_HORSES[index.value - 1])
const next = computed(() => FIXTURE_HORSES[index.value + 1])
</script>

<template>
  <article class="horse" :data-horse-id="horse.id">
    <div class="horse__views">
      <div class="stage"><HorseCanvas :horse="horse" :phase="0.62" view="side" :label="`${horse.name}, close-up`" /></div>
      <div class="stage stage--track"><HorseCanvas :horse="horse" :phase="0.62" view="track" :label="`${horse.name}, as seen on the track`" /></div>
    </div>
    <dl class="facts">
      <div><dt>Number</dt><dd><HorseBadge :horse="horse" size="md" /></dd></div>
      <div><dt>Name</dt><dd data-testid="horse-name">{{ horse.name }}</dd></div>
      <div><dt>Silks</dt><dd><span class="swatch" :style="{ background: horse.color.hex }" /> {{ horse.color.name }} <code>{{ horse.color.hex }}</code></dd></div>
      <div><dt>Condition</dt><dd>{{ horse.condition }} / 100</dd></div>
      <div><dt>Coat</dt><dd>{{ coatFor(horse).name }}</dd></div>
      <div>
        <dt>Fixture program</dt>
        <dd>
          <span v-if="rounds.length === 0">Not drawn in any round.</span>
          <span v-for="r in rounds" :key="r.round" class="chip">Round {{ r.round }}, lane {{ r.lane }}</span>
        </dd>
      </div>
    </dl>
    <nav class="pager" aria-label="Other horses">
      <RouterLink v-if="prev" :to="`/showroom/horses/${prev.id}`">Previous: {{ prev.name }}</RouterLink>
      <RouterLink v-if="next" :to="`/showroom/horses/${next.id}`">Next: {{ next.name }}</RouterLink>
    </nav>
  </article>
</template>

<style scoped>
.horse__views { display: grid; gap: 1rem; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
.stage { height: 380px; }
@media (max-width: 700px) {
  .horse__views { grid-template-columns: minmax(0, 1fr); }
  .stage { height: 280px; }
}
.facts { display: grid; gap: 0.6rem 1.5rem; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); margin: 1.2rem 0; }
.facts dt { color: var(--muted); font-size: var(--step--1); }
.facts dd { margin: 0.15rem 0 0; display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
.swatch { width: 1rem; height: 1rem; border-radius: 3px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.25); }
.chip { background: var(--panel); border: 1px solid var(--line); border-radius: 999px; padding: 0.1rem 0.55rem; font-size: var(--step--1); }
.pager { display: flex; justify-content: space-between; gap: 1rem; }
</style>
