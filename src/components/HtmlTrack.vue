<script setup lang="ts">
import type { Horse, Round } from '@/domain'
import { readableInk } from '@/ui/color'

/**
 * Lightweight track for browsers without WebGL. Same data as the 3D scene:
 * each lane is a column and the badge climbs from the start line to the finish.
 */
defineProps<{
  round: Round
  horsesById: ReadonlyMap<string, Horse>
  positions: ReadonlyMap<string, number>
}>()
</script>

<template>
  <div class="html-track" data-testid="html-track">
    <div class="finish" aria-hidden="true"><span>Finish</span></div>
    <div class="lanes">
      <div v-for="entry in round.entries" :key="entry.lane" class="lane" :data-lane="entry.lane">
        <span
          class="runner"
          :data-horse-id="entry.horseId"
          :style="{
            '--p': Math.min(1, (positions.get(entry.horseId) ?? 0) / round.distance),
            background: horsesById.get(entry.horseId)?.color.hex,
            color: readableInk(horsesById.get(entry.horseId)?.color.hex ?? '#ffffff'),
          }"
        >{{ horsesById.get(entry.horseId)?.number }}</span>
      </div>
    </div>
    <div class="start" aria-hidden="true">
      <span v-for="entry in round.entries" :key="entry.lane">{{ entry.lane }}</span>
    </div>
  </div>
</template>

<style scoped>
.html-track {
  position: absolute; inset: 0;
  display: grid; grid-template-rows: auto 1fr auto;
  background: repeating-linear-gradient(90deg, #a97b4f 0 4px, #a27449 4px 8px);
  padding: 0 0.6rem;
}
.finish {
  border-bottom: 4px solid #fbfaf6;
  text-align: right;
  padding: 0.6rem 0.2rem 0.3rem;
}
.finish span, .start span { font: 700 var(--step-1)/1 var(--font-display); color: #fff; text-shadow: 0 1px 2px rgb(0 0 0 / 0.45); }
.lanes { display: grid; grid-template-columns: repeat(10, 1fr); position: relative; }
.lane { position: relative; border-left: 1px dashed rgb(255 255 255 / 0.35); }
.lane:first-child { border-left: none; }
.runner {
  position: absolute;
  left: 50%;
  bottom: calc(var(--p) * (100% - 1.8rem));
  translate: -50% 0;
  width: 1.8rem; height: 1.8rem;
  border-radius: 50% 50% 45% 45%;
  display: grid; place-items: center;
  font: 700 0.95rem/1 var(--font-display);
  box-shadow: 0 2px 0 rgb(0 0 0 / 0.3), inset 0 0 0 2px rgb(255 255 255 / 0.6);
}
.start { display: grid; grid-template-columns: repeat(10, 1fr); border-top: 3px solid #fbfaf6; text-align: center; padding: 0.3rem 0 0.5rem; }
</style>
