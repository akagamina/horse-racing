<script setup lang="ts">
import { computed } from 'vue'
import type { Horse, Round } from '@/domain'
import { frontRunner } from '@/three/trackLayout'
import { readableInk } from '@/ui/color'

/**
 * Lightweight track for browsers without WebGL. Same data as the 3D scene:
 * each lane is a column and the badge climbs from the start line to the finish.
 */
const props = defineProps<{
  round: Round
  horsesById: ReadonlyMap<string, Horse>
  positions: ReadonlyMap<string, number>
}>()

/** Same leader line as the 3D track: in the leader's lane only, until the first horse finishes. */
const front = computed(() => frontRunner(props.positions, props.round.distance))
</script>

<template>
  <div class="html-track" data-testid="html-track" :style="{ '--lanes': round.entries.length }">
    <div class="finish" aria-hidden="true"><span>Finish</span></div>
    <div class="lanes">
      <div v-for="entry in round.entries" :key="entry.lane" class="lane" :data-lane="entry.lane">
        <span
          v-if="front?.id === entry.horseId"
          class="front-line"
          aria-hidden="true"
          data-testid="leader-line"
          :style="{ '--p': front.progress }"
        />
        <span
          class="runner"
          :data-horse-id="entry.horseId"
          :style="{
            '--p': Math.min(1, (positions.get(entry.horseId) ?? 0) / round.distance),
            background: horsesById.get(entry.horseId)?.color.hex,
            color: readableInk(horsesById.get(entry.horseId)?.color.hex ?? '#ffffff'),
          }"
          >{{ horsesById.get(entry.horseId)?.number }}</span
        >
      </div>
    </div>
    <div class="start" aria-hidden="true">
      <span v-for="entry in round.entries" :key="entry.lane">{{ entry.lane }}</span>
    </div>
  </div>
</template>

<style scoped>
.html-track {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: repeating-linear-gradient(90deg, #a97b4f 0 4px, #a27449 4px 8px);
  padding: 0 0.6rem;
}
.finish {
  border-bottom: 4px solid #fbfaf6;
  text-align: right;
  padding: 0.6rem 0.2rem 0.3rem;
}
.finish span,
.start span {
  font: 700 var(--step-1)/1 var(--font-display);
  color: #fff;
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.45);
}
.lanes {
  display: grid;
  grid-template-columns: repeat(var(--lanes), 1fr);
  position: relative;
}
.lane {
  position: relative;
  border-left: 1px dashed rgb(255 255 255 / 0.35);
}
.lane:first-child {
  border-left: none;
}
.runner {
  position: absolute;
  left: 50%;
  bottom: calc(var(--p) * (100% - 1.8rem));
  translate: -50% 0;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50% 50% 45% 45%;
  display: grid;
  place-items: center;
  font: 700 0.95rem/1 var(--font-display);
  box-shadow:
    0 2px 0 rgb(0 0 0 / 0.3),
    inset 0 0 0 2px rgb(255 255 255 / 0.6);
}
.start {
  display: grid;
  grid-template-columns: repeat(var(--lanes), 1fr);
  border-top: 3px solid #fbfaf6;
  text-align: center;
  padding: 0.3rem 0 0.5rem;
}
.front-line {
  position: absolute;
  left: 0;
  right: 0;
  /* Top edge of the leader's badge: its nose. */
  bottom: calc(var(--p) * (100% - 1.8rem) + 1.8rem);
  height: 3px;
  background: #19d3ff;
  box-shadow: 0 0 6px rgb(25 211 255 / 0.8);
  pointer-events: none;
}
</style>
