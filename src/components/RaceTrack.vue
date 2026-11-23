<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { Horse, Round } from '@/domain'
import { useReducedMotion } from '@/composables/useReducedMotion'
import type { RaceScene, TrackOverlay } from '@/three/raceScene'
import { supportsWebGL } from '@/three/webgl'
import { roundTitle } from '@/ui/format'
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
  }>(),
  { forceHtml: false },
)

type Mode = 'loading' | 'webgl' | 'html'
const mode = ref<Mode>('loading')
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
  if (props.forceHtml || !supportsWebGL()) {
    mode.value = 'html'
    return
  }
  try {
    // Saddle-cloth numbers are painted with the display font, so wait for it.
    await document.fonts?.load('700 70px "Barlow Condensed"').catch(() => undefined)
    const { RaceScene } = await import('@/three/raceScene')
    if (disposed || !canvas.value) return
    scene = new RaceScene(canvas.value)
    scene.setField(field.value)
    mode.value = 'webgl'
    await nextTick()
    measure()
    observer = new ResizeObserver(measure)
    if (stage.value) observer.observe(stage.value)
  } catch (error) {
    console.warn('WebGL track unavailable, using the HTML track.', error)
    scene?.dispose()
    scene = null
    mode.value = 'html'
  }
}

watch(field, (next) => {
  scene?.setField(next)
  draw()
})
watch(() => [props.positions, props.started, reducedMotion.value], draw)

onMounted(bootWebGL)
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
      <p v-if="leader && started" class="track__leader" aria-hidden="true">
        <HorseBadge :horse="leader.horse" />
        <span class="track__leader-name">{{ leader.horse.name }} leads</span>
        <span class="track__left">{{ leader.left > 0 ? `${leader.left} m to go` : 'Finished' }}</span>
      </p>
    </header>

    <div ref="stage" class="track__stage">
      <canvas v-show="mode !== 'html'" ref="canvas" class="track__canvas" data-testid="track-canvas" aria-hidden="true" />

      <template v-if="mode === 'webgl' && overlay && round">
        <span
          class="finish-label"
          aria-hidden="true"
          :style="{ left: `${overlay.finishRight.x}px`, top: `${overlay.finishRight.y}px` }"
        >Finish</span>
        <span
          v-for="(point, index) in overlay.lanes"
          :key="index"
          class="lane-label"
          aria-hidden="true"
          :style="{ left: `${point.x}px`, top: `${point.y}px` }"
        >{{ index + 1 }}</span>
      </template>

      <HtmlTrack v-if="mode === 'html' && round" :round="round" :horses-by-id="horsesById" :positions="positions" />

      <p v-if="mode === 'loading'" class="track__note">Setting up the track…</p>
      <p v-else-if="!round" class="track__note track__note--idle">
        The gate is empty. Generate a program to bring the first ten horses out.
      </p>
    </div>

    <ol v-if="round && started" class="track__order" aria-hidden="true" data-testid="live-order">
      <li v-for="horse in orderedHorses" :key="horse.id"><HorseBadge :horse="horse" /></li>
    </ol>

    <table v-if="round" class="visually-hidden">
      <caption>{{ roundTitle(round.number, round.distance) }}: lanes on the track</caption>
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
  display: flex; flex-direction: column;
  background: var(--turf-deep);
  border-radius: var(--radius-m);
  overflow: hidden;
  min-height: 0;
  color: #fff;
}
.track__head {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  min-height: 3rem;
}
.track__head h2 { font-size: var(--step-2); white-space: nowrap; }
.track__leader { margin: 0; display: flex; align-items: center; gap: 0.45rem; font-size: var(--step--1); white-space: nowrap; overflow: hidden; }
@media (max-width: 520px) {
  .track__leader-name { display: none; }
}
.track__left { font: 600 var(--step-0)/1 var(--font-display); color: var(--saffron); font-variant-numeric: tabular-nums; }
.track__stage { position: relative; flex: 1; min-height: 0; background: #bfd9e2; }
.track__canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.track__note {
  position: absolute; inset: auto 1rem 1rem; margin: 0;
  background: rgb(22 34 46 / 0.82); color: #fff;
  padding: 0.6rem 0.8rem; border-radius: var(--radius-s); font-size: var(--step--1);
}
.track__note--idle { inset: 40% 1.5rem auto; text-align: center; font-size: var(--step-0); }
.lane-label {
  position: absolute; translate: -50% 0;
  font: 700 0.9rem/1 var(--font-display);
  background: var(--panel); color: var(--ink);
  min-width: 1.35rem; padding: 0.18rem 0.25rem; border-radius: 3px; text-align: center;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
  pointer-events: none;
}
.finish-label {
  position: absolute; translate: -100% -140%;
  font: 700 var(--step-1)/1 var(--font-display);
  color: #fff; background: var(--post);
  padding: 0.2rem 0.45rem; border-radius: 3px;
  pointer-events: none;
}
.track__order {
  list-style: none; margin: 0; padding: 0.45rem 0.6rem;
  display: flex; gap: 0.3rem; overflow-x: auto;
  background: rgb(0 0 0 / 0.18);
}
.track__order li:first-child :deep(.badge) { box-shadow: 0 0 0 2px var(--saffron); }
</style>
