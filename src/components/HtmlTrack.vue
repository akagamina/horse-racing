<script setup lang="ts">
import { computed } from 'vue'
import type { Horse, Round } from '@/domain'
import { gallopPhase } from '@/three/trackLayout'
import { roundTitle } from '@/ui/format'

/**
 * The classic 2D track, laid out like the brief's example: one row per lane,
 * horses run left to right, the finish is the red line on the right. Same
 * data as the 3D scene, no WebGL needed, so it is also the fallback.
 */
const props = defineProps<{
  round: Round
  horsesById: ReadonlyMap<string, Horse>
  positions: ReadonlyMap<string, number>
}>()

const runners = computed(() =>
  props.round.entries.map((entry) => {
    const horse = props.horsesById.get(entry.horseId)
    const metres = props.positions.get(entry.horseId) ?? 0
    const progress = Math.min(1, metres / props.round.distance)
    // Two leg positions, chosen from distance covered, never from wall time.
    const running = progress > 0 && progress < 1
    const stride = running && gallopPhase(metres, (entry.lane * 0.618) % 1) < 0.5 ? 'reach' : 'gather'
    return { lane: entry.lane, horseId: entry.horseId, horse, progress, stride }
  }),
)
</script>

<template>
  <div class="classic" data-testid="html-track">
    <div class="classic__field">
      <div v-for="runner in runners" :key="runner.lane" class="lane" :data-lane="runner.lane">
        <span class="lane__number" aria-hidden="true">{{ runner.lane }}</span>
        <div class="lane__run">
          <span
            class="runner"
            :data-horse-id="runner.horseId"
            :data-stride="runner.stride"
            :style="{ '--p': runner.progress, '--silk': runner.horse?.color.hex ?? '#888' }"
          >
            <svg class="runner__horse" viewBox="0 0 64 40" aria-hidden="true">
              <!-- Original silhouette drawn for this project: tail, body, neck and head, rider. -->
              <path class="horse" d="M14 17 Q5 14 3 23 Q9 19 14 21 Z" />
              <ellipse class="horse" cx="28" cy="20" rx="15" ry="7" />
              <path class="horse" d="M37 16 L46 6 L55 8 L58 13 L51 13.5 L45 22 Z" />
              <g class="legs legs--reach">
                <path d="M40 24 L50 32" />
                <path d="M37 25 L44 35" />
                <path d="M18 24 L8 31" />
                <path d="M21 25 L14 35" />
              </g>
              <g class="legs legs--gather">
                <path d="M40 24 L39 35" />
                <path d="M37 25 L33 33" />
                <path d="M18 24 L22 35" />
                <path d="M21 25 L26 33" />
              </g>
              <path class="rider" d="M27 13 Q31 6 37 8 L35 13 Z" />
              <circle class="rider" cx="37" cy="6" r="2.6" />
            </svg>
            <span class="runner__number">{{ runner.horse?.number }}</span>
          </span>
        </div>
      </div>
      <div class="finish-line" aria-hidden="true" />
    </div>
    <div class="classic__foot" aria-hidden="true">
      <span class="classic__round">{{ roundTitle(round.number, round.distance) }}</span>
      <span class="classic__finish">Finish</span>
    </div>
  </div>
</template>

<style scoped>
.classic {
  --runner-width: 4.6rem;
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: 1fr auto;
  background: #e7e9e4;
  color: var(--ink);
}
.classic__field {
  position: relative;
  display: grid;
  grid-template-rows: repeat(v-bind('round.entries.length'), 1fr);
  padding-right: 1.4rem;
}
.lane {
  display: grid;
  grid-template-columns: 1.9rem 1fr;
  min-height: 0;
  border-bottom: 1px dashed #8d948c;
}
.lane:first-child {
  border-top: 1px dashed #8d948c;
}
.lane__number {
  display: grid;
  place-items: center;
  background: var(--turf);
  color: #fff;
  font: 700 var(--step-0) / 1 var(--font-display);
  border-bottom: 1px solid rgb(255 255 255 / 0.25);
}
.lane__run {
  position: relative;
  min-height: 0;
}
.runner {
  position: absolute;
  top: 50%;
  left: calc(var(--p) * (100% - var(--runner-width)));
  translate: 0 -50%;
  width: var(--runner-width);
  height: 100%;
  max-height: 3.2rem;
  display: flex;
  align-items: center;
}
.runner__horse {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.horse {
  fill: var(--silk);
  stroke: #16222e;
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.legs path {
  stroke: #16222e;
  stroke-width: 2.6;
  stroke-linecap: round;
  fill: none;
}
.rider {
  fill: #16222e;
}
.runner[data-stride='reach'] .legs--gather,
.runner[data-stride='gather'] .legs--reach {
  display: none;
}
.runner__number {
  position: absolute;
  left: 38%;
  top: 50%;
  translate: -50% -50%;
  font: 700 0.75rem / 1 var(--font-display);
  color: #fff;
  text-shadow:
    0 0 2px #16222e,
    0 0 2px #16222e;
  pointer-events: none;
}
.finish-line {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 1.4rem;
  width: 3px;
  background: var(--post);
}
.classic__foot {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.4rem 0.6rem 0.5rem 2.4rem;
  font: 700 var(--step-1) / 1 var(--font-display);
  color: var(--post);
}
.classic__finish {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
