<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { Horse, Round } from '@/domain'
import { useReducedMotion } from '@/composables/useReducedMotion'
import type { RaceScene, TrackOverlay } from '@/three/raceScene'
import { supportsWebGL } from '@/three/webgl'
import { raceTime, roundTitle } from '@/ui/format'
import HorseBadge from './HorseBadge.vue'
import HtmlTrack from './HtmlTrack.vue'

const props = withDefaults(
  defineProps<{
    round: Round | null
    horsesById: ReadonlyMap<string, Horse>
    positions: ReadonlyMap<string, number>
    /** False while the field waits at the gate. */
    started: boolean
    /** Horse ids, current leader first. */
    standings: readonly string[]
    forceHtml?: boolean
    /** Winner of the round that has just finished; shown until the next one starts. */
    winner?: { horse: Horse; time: number } | null
  }>(),
  { forceHtml: false, winner: null },
)

type Mode = 'loading' | 'webgl' | 'html'
type View = '3d' | '2d'
/** Which track the viewer picked. Presentation only, so it lives here and not in the store. */
const view = ref<View>(props.forceHtml ? '2d' : '3d')
const webglFailed = ref(false)
const sceneReady = ref(false)
const mode = computed<Mode>(() => {
  if (view.value === '2d' || webglFailed.value) return 'html'
  return sceneReady.value ? 'webgl' : 'loading'
})
const stage = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const overlay = shallowRef<TrackOverlay | null>(null)
const reducedMotion = useReducedMotion()
let scene: RaceScene | null = null
let observer: ResizeObserver | null = null
let disposed = false

const field = computed(() =>
  (props.round?.entries ?? []).flatMap((entry) => {
    const horse = props.horsesById.get(entry.horseId)
    return horse ? [{ horse, lane: entry.lane }] : []
  }),
)

const leader = computed(() => {
  const id = props.standings[0]
  const horse = id ? props.horsesById.get(id) : undefined
  if (!horse || !props.round) return null
  const left = Math.max(0, props.round.distance - (props.positions.get(horse.id) ?? 0))
  return { horse, left: Math.ceil(left) }
})

const orderedHorses = computed(() => props.standings.flatMap((id) => props.horsesById.get(id) ?? []))

/** Places in the live order that also show the horse's name. */
const PODIUM = 3

const NO_POSITIONS: ReadonlyMap<string, number> = new Map()

function draw(): void {
  if (!scene) return
  if (!props.round) {
    // Empty straight before the first program: track, gate and posts only.
    scene.render({ distance: 0, positions: NO_POSITIONS, started: false, reducedMotion: reducedMotion.value })
    return
  }
  scene.render({
    distance: props.round.distance,
    positions: props.positions,
    started: props.started,
    reducedMotion: reducedMotion.value,
  })
}

function measure(): void {
  if (!scene || !stage.value) return
  const { width, height } = stage.value.getBoundingClientRect()
  scene.resize(width, height)
  overlay.value = scene.overlay()
  draw()
}

async function bootWebGL(): Promise<void> {
  if (!supportsWebGL()) {
    webglFailed.value = true
    return
  }
  try {
    // Saddle-cloth numbers are painted with the display font, so wait for it.
    await document.fonts?.load('700 70px "Barlow Condensed"').catch(() => undefined)
    const { RaceScene } = await import('@/three/raceScene')
    if (disposed || !canvas.value) return
    scene = new RaceScene(canvas.value)
    scene.setField(field.value)
    sceneReady.value = true
    await nextTick()
    measure()
    observer = new ResizeObserver(measure)
    if (stage.value) observer.observe(stage.value)
  } catch (error) {
    console.warn('WebGL track unavailable, using the HTML track.', error)
    scene?.dispose()
    scene = null
    webglFailed.value = true
  }
}

/** 3D is built the first time it is asked for and kept, so switching back is instant. */
function showView(next: View): void {
  view.value = next
  if (next !== '3d') return
  if (!scene && !webglFailed.value) void bootWebGL()
  else void nextTick(measure)
}

watch(field, (next) => {
  scene?.setField(next)
  draw()
})
watch(() => [props.positions, props.started, reducedMotion.value], draw)

onMounted(() => {
  if (view.value === '3d') void bootWebGL()
})
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  scene?.dispose()
  scene = null
})
</script>

<template>
  <section class="track" aria-labelledby="track-title" :data-mode="mode" data-testid="race-track">
    <header class="track__head">
      <h2 id="track-title">{{ round ? roundTitle(round.number, round.distance) : 'Track' }}</h2>
      <div v-if="!webglFailed" class="view-switch" role="group" aria-label="Track view" data-testid="view-switch">
        <button
          v-for="option in ['3d', '2d'] as const"
          :key="option"
          type="button"
          :class="{ 'is-active': view === option }"
          :aria-pressed="view === option"
          :data-view="option"
          @click="showView(option)"
        >
          {{ option.toUpperCase() }}
        </button>
      </div>
      <p v-if="leader && started" class="track__leader" aria-hidden="true">
        <HorseBadge :horse="leader.horse" />
        <span class="track__leader-name">{{ leader.horse.name }} leads</span>
        <span class="track__left">{{ leader.left > 0 ? `${leader.left} m to go` : 'Finished' }}</span>
      </p>
    </header>

    <div ref="stage" class="track__stage">
      <canvas v-show="mode !== 'html'" ref="canvas" class="track__canvas" data-testid="track-canvas" aria-hidden="true" />

      <template v-if="mode === 'webgl' && overlay && round">
        <span class="finish-label" aria-hidden="true" :style="{ left: `${overlay.finishRight.x}px`, top: `${overlay.finishRight.y}px` }"
          >Finish</span
        >
        <span
          v-for="(point, index) in overlay.lanes"
          :key="index"
          class="lane-label"
          aria-hidden="true"
          :style="{ left: `${point.x}px`, top: `${point.y}px` }"
          >{{ index + 1 }}</span
        >
      </template>

      <HtmlTrack v-if="mode === 'html' && round" :round="round" :horses-by-id="horsesById" :positions="positions" />

      <Transition name="banner">
        <p v-if="winner && round" class="winner" data-testid="winner-banner" aria-hidden="true">
          <span class="winner__label">Round {{ round.number }} winner</span>
          <span class="winner__who">
            <HorseBadge :horse="winner.horse" size="md" />
            <span class="winner__name">{{ winner.horse.name }}</span>
          </span>
          <span class="winner__time">{{ raceTime(winner.time) }}</span>
        </p>
      </Transition>

      <p v-if="mode === 'loading'" class="track__note">Setting up the track…</p>
      <p v-else-if="!round" class="track__note track__note--idle">
        The gate is empty. Generate a program to bring the first ten horses out.
      </p>
    </div>

    <ol v-if="round && started" class="track__order" aria-hidden="true" data-testid="live-order">
      <li v-for="(horse, index) in orderedHorses" :key="horse.id" :class="{ podium: index < PODIUM }">
        <span v-if="index < PODIUM" class="podium__place">{{ index + 1 }}</span>
        <HorseBadge :horse="horse" />
        <span v-if="index < PODIUM" class="podium__name">{{ horse.name }}</span>
      </li>
    </ol>

    <table v-if="round" class="visually-hidden">
      <caption>
        {{
          roundTitle(round.number, round.distance)
        }}: lanes on the track
      </caption>
      <tbody>
        <tr v-for="entry in field" :key="entry.lane">
          <th scope="row">Lane {{ entry.lane }}</th>
          <td>Number {{ entry.horse.number }}, {{ entry.horse.name }}, {{ entry.horse.color.name }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.track {
  display: flex;
  flex-direction: column;
  background: var(--turf-deep);
  border-radius: var(--radius-m);
  overflow: hidden;
  min-height: 0;
  color: #fff;
}
.track__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  min-height: 3rem;
}
.view-switch {
  display: inline-flex;
  margin-right: auto;
  border: 1px solid rgb(255 255 255 / 0.5);
  border-radius: var(--radius-s);
  overflow: hidden;
}
.view-switch button {
  appearance: none;
  border: 0;
  background: transparent;
  color: #fff;
  font: 600 var(--step--1) / 1 var(--font-display);
  letter-spacing: 0.04em;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
}
.view-switch button.is-active {
  background: #fff;
  color: var(--turf-deep);
}
.track__head h2 {
  font-size: var(--step-2);
  white-space: nowrap;
}
.track__leader {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: var(--step--1);
  white-space: nowrap;
  overflow: hidden;
}
@media (max-width: 520px) {
  .track__leader-name {
    display: none;
  }
}
.track__left {
  font: 600 var(--step-0)/1 var(--font-display);
  color: var(--saffron);
  font-variant-numeric: tabular-nums;
}
.track__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #bfd9e2;
}
.track__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.track__note {
  position: absolute;
  inset: auto 1rem 1rem;
  margin: 0;
  background: rgb(22 34 46 / 0.82);
  color: #fff;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-s);
  font-size: var(--step--1);
}
.track__note--idle {
  inset: 40% 1.5rem auto;
  text-align: center;
  font-size: var(--step-0);
}
.lane-label {
  position: absolute;
  translate: -50% 0;
  font: 700 0.9rem/1 var(--font-display);
  background: var(--panel);
  color: var(--ink);
  min-width: 1.35rem;
  padding: 0.18rem 0.25rem;
  border-radius: 3px;
  text-align: center;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
  pointer-events: none;
}
.finish-label {
  position: absolute;
  translate: -100% -140%;
  font: 700 var(--step-1)/1 var(--font-display);
  color: #fff;
  background: var(--post);
  padding: 0.2rem 0.45rem;
  border-radius: 3px;
  pointer-events: none;
}
.track__order {
  list-style: none;
  margin: 0;
  padding: 0.45rem 0.6rem;
  display: flex;
  gap: 0.3rem;
  overflow-x: auto;
  background: rgb(0 0 0 / 0.18);
}
.track__order {
  align-items: center;
  min-height: 2.6rem;
}
.track__order li {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex: none;
}
.track__order li.podium {
  padding: 0.15rem 0.55rem 0.15rem 0.2rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.12);
  font-size: var(--step--1);
  white-space: nowrap;
}
.track__order li:first-child {
  background: var(--saffron);
  color: var(--ink);
  font-weight: 600;
}
.podium__place {
  font: 700 var(--step-0) / 1 var(--font-display);
  min-width: 1rem;
  text-align: center;
}
@media (max-width: 520px) {
  .podium__name {
    display: none;
  }
}

.winner {
  position: absolute;
  left: 50%;
  top: 38%;
  translate: -50% -50%;
  margin: 0;
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  padding: 0.9rem 1.4rem 1rem;
  max-width: calc(100% - 2rem);
  background: rgb(22 34 46 / 0.9);
  color: #fff;
  border-radius: var(--radius-m);
  border-top: 4px solid var(--saffron);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.35);
  text-align: center;
  pointer-events: none;
}
.winner__label {
  font: 600 var(--step-0) / 1 var(--font-display);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--saffron);
}
.winner__who {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}
.winner__name {
  font: 700 var(--step-3) / 1 var(--font-display);
}
.winner__time {
  font-size: var(--step--1);
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}
.banner-enter-active,
.banner-leave-active {
  transition:
    opacity 0.25s ease,
    scale 0.25s ease;
}
.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  scale: 0.92;
}
</style>
