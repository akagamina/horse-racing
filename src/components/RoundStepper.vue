<script setup lang="ts">
import { computed } from 'vue'

/** The six rounds at a glance: which are done, which is on the track, which wait. */
type StepState = 'done' | 'active' | 'pending'

const props = defineProps<{
  distances: readonly number[]
  /** Rounds whose results are published. */
  completed: number
  /** 1-based round on the track; null when none is. */
  active: number | null
}>()

const steps = computed(() =>
  props.distances.map((distance, index) => {
    const number = index + 1
    const state: StepState = number <= props.completed ? 'done' : number === props.active ? 'active' : 'pending'
    return { number, distance, state }
  }),
)
const label: Record<StepState, string> = { done: 'finished', active: 'on track', pending: 'to come' }
</script>

<template>
  <ol class="stepper" aria-label="Rounds" data-testid="round-stepper">
    <li
      v-for="step in steps"
      :key="step.number"
      class="step"
      :class="`step--${step.state}`"
      :data-state="step.state"
      :aria-current="step.state === 'active' ? 'step' : undefined"
    >
      <span class="step__number" aria-hidden="true">{{ step.state === 'done' ? '✓' : step.number }}</span>
      <span class="step__distance">{{ step.distance }}<span class="step__unit"> m</span></span>
      <span class="visually-hidden">, round {{ step.number }}, {{ label[step.state] }}</span>
    </li>
  </ol>
</template>

<style scoped>
.stepper {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 0.3rem;
  min-width: 0;
}
.step {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--muted);
  font: 600 var(--step-0) / 1 var(--font-display);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.step__number {
  display: inline-grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: var(--panel-sunk);
  font-size: var(--step--1);
}
.step--done {
  color: var(--ink);
  border-color: var(--turf);
}
.step--done .step__number {
  background: var(--turf);
  color: #fff;
}
.step--active {
  color: var(--ink);
  background: var(--saffron);
  border-color: var(--ink);
}
.step--active .step__number {
  background: var(--ink);
  color: #fff;
}
@media (max-width: 520px) {
  .step {
    padding: 0.3rem 0.2rem;
    gap: 0.2rem;
  }
  .step__unit {
    display: none;
  }
}
</style>
