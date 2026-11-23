<script setup lang="ts">
import { computed } from 'vue'
import { horsePortrait } from '@/three/horseStage'
import { FIXTURE_HORSES, type ShowroomEntry } from '@/showroom/manifest'
import { createFixtureStore, type FixtureSlug } from '@/showroom/fixtures'

/**
 * Small static preview for the index. State thumbnails are drawn from the
 * real fixture store (lane dots at their true positions); horse and visual
 * thumbnails are PNGs from one shared off-screen renderer.
 */
const props = defineProps<{ entry: ShowroomEntry }>()

const horse = computed(() => {
  if (props.entry.kind === 'horses') return FIXTURE_HORSES.find((h) => h.id === props.entry.slug)
  if (props.entry.kind === 'visuals' && props.entry.slug !== 'html-track') return FIXTURE_HORSES[props.entry.slug === 'galloping-horse' ? 2 : 0]
  return undefined
})
const image = computed(() => (horse.value ? horsePortrait(horse.value, 240, 150) : null))

const lanes = computed(() => {
  const { kind, slug } = props.entry
  const fixture: FixtureSlug | null =
    kind === 'states' ? (slug as FixtureSlug) : kind === 'screens' ? 'race-board' : kind === 'components' && slug === 'race-track' ? 'race-board' : slug === 'html-track' ? 'running' : null
  if (!fixture) return null
  const store = createFixtureStore(fixture)
  const round = store.currentRound
  return {
    status: store.status,
    results: store.results.length,
    dots: (round?.entries ?? []).map((entry) => ({
      lane: entry.lane,
      p: round ? (store.positions.get(entry.horseId) ?? 0) / round.distance : 0,
      color: store.horsesById.get(entry.horseId)?.color.hex ?? '#fff',
    })),
  }
})
</script>

<template>
  <div class="thumb" aria-hidden="true">
    <img v-if="image" :src="image" alt="" width="240" height="150" />
    <svg v-else-if="lanes" viewBox="0 0 240 150">
      <rect width="240" height="150" fill="#2f6b3e" />
      <rect x="20" y="10" width="200" height="130" fill="#a97b4f" />
      <rect x="20" y="16" width="200" height="3" fill="#fbfaf6" />
      <rect x="20" y="128" width="200" height="2" fill="#fbfaf6" />
      <circle v-for="dot in lanes.dots" :key="dot.lane" :cx="20 + dot.lane * 18.2 - 9" :cy="124 - dot.p * 104" r="6" :fill="dot.color" stroke="#16222e" stroke-width="1" />
      <g v-for="n in lanes.results" :key="n">
        <rect :x="226" :y="12 + (n - 1) * 21" width="10" height="17" rx="2" fill="#f2b233" />
      </g>
    </svg>
    <svg v-else viewBox="0 0 240 150">
      <rect width="240" height="150" fill="#f4f6f3" />
      <template v-if="entry.slug === 'controls'">
        <rect x="30" y="58" width="100" height="34" rx="4" fill="#f2b233" stroke="#16222e" stroke-width="2" />
        <rect x="140" y="58" width="70" height="34" rx="4" fill="#fff" stroke="#16222e" stroke-width="2" />
      </template>
      <template v-else>
        <rect x="24" y="22" width="192" height="16" fill="#e2e8e2" />
        <g v-for="row in 6" :key="row">
          <circle cx="38" :cy="38 + row * 15" r="5" :fill="['#d7263d', '#1f4fd1', '#f2b233', '#119e5b', '#7b3fd6', '#f26b1d'][row - 1]" />
          <rect x="52" :y="34 + row * 15" :width="entry.slug === 'horse-roster' ? 110 : 140" height="7" rx="2" fill="#c9d2ca" />
        </g>
      </template>
    </svg>
  </div>
</template>

<style scoped>
.thumb { aspect-ratio: 240 / 150; border-radius: 6px; overflow: hidden; background: #dce7e4; }
.thumb img, .thumb svg { width: 100%; height: 100%; display: block; object-fit: cover; }
</style>
