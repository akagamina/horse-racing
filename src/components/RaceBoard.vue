<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { useRaceLoop } from '@/composables/useRaceLoop'
import { ROUND_DISTANCES } from '@/domain'
import { SESSION_OPTIONS } from '@/injection'
import type { RaceStore } from '@/stores/race'
import HorseRoster from './HorseRoster.vue'
import RaceControls from './RaceControls.vue'
import RaceTrack from './RaceTrack.vue'
import RoundProgram from './RoundProgram.vue'
import RoundResults from './RoundResults.vue'
import RoundStepper from './RoundStepper.vue'

/**
 * The full game screen. It renders whichever store it is given: the app's
 * own store on the game page, or an isolated fixture store in the showroom.
 */
const props = withDefaults(defineProps<{ store: RaceStore; drive?: boolean }>(), { drive: true })
const session = inject(SESSION_OPTIONS, { seed: undefined, forceHtmlTrack: false })

if (props.drive) useRaceLoop(props.store)

const s = computed(() => props.store)
const started = computed(() => s.value.status === 'running' || s.value.status === 'paused' || s.value.status === 'completed')
const activeIds = computed(
  () => new Set(s.value.isRacing || s.value.status === 'ready' ? (s.value.currentRound?.entries.map((e) => e.horseId) ?? []) : []),
)
const activeRound = computed(() =>
  s.value.status === 'idle' || s.value.status === 'completed' ? null : (s.value.currentRound?.number ?? null),
)
const distances = computed(() => s.value.program?.map((round) => round.distance) ?? ROUND_DISTANCES)
const leaderId = computed(() => (s.value.isRacing ? (s.value.standings[0] ?? null) : null))

/** Winner of the round still standing on the track after its finish. */
const winner = computed(() => {
  const round = s.value.currentRound
  if (!round || !s.value.roundFinished) return null
  const first = s.value.results.find((result) => result.roundNumber === round.number)?.placings[0]
  const horse = first && s.value.horsesById.get(first.horseId)
  return first && horse ? { horse, time: first.time } : null
})

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
      <RoundStepper class="board__stepper" :distances="distances" :completed="store.results.length" :active="activeRound" />
      <RaceControls
        :status="store.status"
        :can-generate="store.canGenerate"
        :speed="store.speed"
        @generate="store.generate()"
        @toggle="store.toggle()"
        @speed="store.setSpeed($event)"
      />
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
        :winner="winner"
      />
      <div class="area-rounds">
        <RoundProgram :program="store.program" :horses-by-id="store.horsesById" :active-round="activeRound" />
        <RoundResults :results="store.results" :horses-by-id="store.horsesById" />
      </div>
      <HorseRoster class="area-roster" :horses="store.horses" :active-ids="activeIds" :leader-id="leaderId" />
    </main>

    <p class="visually-hidden" aria-live="polite" data-testid="announcer">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}
.board__bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: calc(0.6rem + env(safe-area-inset-top, 0px)) 1rem 0.6rem;
  margin-top: calc(-1 * env(safe-area-inset-top, 0px));
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}
.board__title {
  font-size: var(--step-3);
  letter-spacing: 0.005em;
}
/* Phones: the stepper takes its own row under the title and buttons. */
.board__stepper {
  order: 3;
  flex: 1 1 100%;
}
@media (min-width: 1180px) {
  .board__stepper {
    order: 0;
    flex: 0 1 34rem;
  }
}

/* Mobile first: controls → track → program/results → horse list */
.board__grid {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'track' 'rounds' 'roster';
}
.area-track {
  grid-area: track;
  height: min(78svh, 720px);
  min-height: 460px;
}
.area-rounds {
  grid-area: rounds;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr);
}
.area-rounds > :deep(.panel) {
  max-height: 30rem;
}
.area-roster {
  grid-area: roster;
  max-height: 34rem;
}

@media (min-width: 760px) {
  .area-rounds {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Desktop: the track is the centre of attention, panels scroll on their own. */
@media (min-width: 1180px) {
  .board {
    height: 100vh;
    height: 100dvh;
  }
  .board__grid {
    flex: 1;
    min-height: 0;
    grid-template-columns: minmax(310px, 0.8fr) minmax(480px, 1.8fr) minmax(310px, 0.8fr);
    grid-template-areas: 'roster track rounds';
  }
  .area-track,
  .area-rounds,
  .area-roster {
    height: auto;
    min-height: 0;
    max-height: none;
  }
  /* Program above Results: both stay in view and follow the race on their own. */
  .area-rounds {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: repeat(2, minmax(0, 1fr));
  }
  .area-rounds > :deep(.panel) {
    max-height: none;
  }
}
</style>
