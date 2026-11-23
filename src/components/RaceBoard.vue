<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { useRaceLoop } from '@/composables/useRaceLoop'
import { SESSION_OPTIONS } from '@/injection'
import type { RaceStore } from '@/stores/race'
import HorseRoster from './HorseRoster.vue'
import RaceControls from './RaceControls.vue'
import RaceTrack from './RaceTrack.vue'
import RoundProgram from './RoundProgram.vue'
import RoundResults from './RoundResults.vue'

/**
 * The full game screen. It renders whichever store it is given: the app's
 * own store on the game page, or an isolated fixture store in the showroom.
 */
const props = withDefaults(defineProps<{ store: RaceStore; drive?: boolean }>(), { drive: true })
const session = inject(SESSION_OPTIONS, { seed: undefined, forceHtmlTrack: false })

if (props.drive) useRaceLoop(props.store)

const s = computed(() => props.store)
const started = computed(() => s.value.status === 'running' || s.value.status === 'paused' || s.value.status === 'completed')
const activeIds = computed(() => new Set(s.value.isRacing || s.value.status === 'ready' ? (s.value.currentRound?.entries.map((e) => e.horseId) ?? []) : []))
const activeRound = computed(() => (s.value.status === 'idle' || s.value.status === 'completed' ? null : (s.value.currentRound?.number ?? null)))

// One polite message per meaningful change: never per frame.
const announcement = ref('')
watch(
  () => [s.value.status, s.value.roundIndex, s.value.results.length] as const,
  ([status, , published], [prevStatus, , prevPublished]) => {
    const round = s.value.currentRound
    if (published > prevPublished) {
      const latest = s.value.results[published - 1]
      const winner = latest && s.value.horsesById.get(latest.placings[0]!.horseId)
      announcement.value = latest && winner ? `Round ${latest.roundNumber} finished. ${winner.name} wins.` : ''
      if (status === 'completed') announcement.value += ' All six rounds are complete.'
    } else if (status === 'running' && round && (prevStatus === 'ready' || s.value.clock === 0)) {
      announcement.value = `Round ${round.number}, ${round.distance} metres, is under way.`
    } else if (status === 'paused') {
      announcement.value = 'Race paused.'
    } else if (status === 'running' && prevStatus === 'paused') {
      announcement.value = 'Race resumed.'
    } else if (status === 'ready' && prevStatus !== 'ready') {
      announcement.value = 'Program ready. Round 1 is at the gate.'
    }
  },
)
</script>

<template>
  <div class="board" :data-status="store.status" data-testid="race-board">
    <header class="board__bar">
      <h1 class="board__title">Horse Racing</h1>
      <RaceControls :status="store.status" :can-generate="store.canGenerate" @generate="store.generate()" @toggle="store.toggle()" />
    </header>

    <main id="main" class="board__grid">
      <RaceTrack
        class="area-track"
        :round="store.currentRound"
        :horses-by-id="store.horsesById"
        :positions="store.positions"
        :started="started"
        :standings="store.standings"
        :force-html="session.forceHtmlTrack"
      />
      <div class="area-rounds">
        <RoundProgram :program="store.program" :horses-by-id="store.horsesById" :active-round="activeRound" />
        <RoundResults :results="store.results" :horses-by-id="store.horsesById" />
      </div>
      <HorseRoster class="area-roster" :horses="store.horses" :active-ids="activeIds" />
    </main>

    <p class="visually-hidden" aria-live="polite" data-testid="announcer">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.board {
  display: flex; flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}
.board__bar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  padding: calc(0.6rem + env(safe-area-inset-top, 0px)) 1rem 0.6rem;
  margin-top: calc(-1 * env(safe-area-inset-top, 0px));
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}
.board__title { font-size: var(--step-3); letter-spacing: 0.005em; }

/* Mobile first: controls → track → program/results → horse list */
.board__grid {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'track' 'rounds' 'roster';
}
.area-track { grid-area: track; height: min(78svh, 720px); min-height: 460px; }
.area-rounds { grid-area: rounds; display: grid; gap: 0.75rem; grid-template-columns: minmax(0, 1fr); }
.area-rounds > :deep(.panel) { max-height: 30rem; }
.area-roster { grid-area: roster; max-height: 34rem; }

@media (min-width: 760px) {
  .area-rounds { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* Desktop: the track is the centre of attention, panels scroll on their own. */
@media (min-width: 1180px) {
  .board { height: 100vh; height: 100dvh; }
  .board__grid {
    flex: 1; min-height: 0;
    grid-template-columns: minmax(250px, 0.8fr) minmax(420px, 1.25fr) minmax(470px, 1.45fr);
    grid-template-areas: 'roster track rounds';
  }
  .area-track, .area-rounds, .area-roster { height: auto; min-height: 0; max-height: none; }
  .area-rounds { grid-template-rows: minmax(0, 1fr); }
  .area-rounds > :deep(.panel) { max-height: none; }
}
</style>
