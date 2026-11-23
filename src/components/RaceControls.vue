<script setup lang="ts">
import { computed } from 'vue'
import { SPEEDS, type RaceStatus, type Speed } from '@/stores/race'

const props = withDefaults(defineProps<{ status: RaceStatus; canGenerate: boolean; speed?: Speed }>(), { speed: 1 })
const emit = defineEmits<{ generate: []; toggle: []; speed: [Speed] }>()

const toggleLabel = computed(() => {
  if (props.status === 'running') return 'Pause'
  if (props.status === 'paused') return 'Resume'
  return 'Start'
})
const toggleEnabled = computed(() => ['ready', 'running', 'paused'].includes(props.status))

const hint = computed(() => {
  switch (props.status) {
    case 'idle':
      return 'Generate a program to draw six rounds of ten horses.'
    case 'ready':
      return 'The first round is at the gate. Press Start.'
    case 'completed':
      return 'All six rounds are run. Generate a new program to race again.'
    default:
      return ''
  }
})
</script>

<template>
  <div class="controls">
    <div class="controls__buttons" role="group" aria-label="Race controls">
      <button
        type="button"
        class="btn"
        :class="{ 'btn--primary': status === 'idle' || status === 'completed' }"
        :disabled="!canGenerate"
        data-testid="generate"
        @click="emit('generate')"
      >
        Generate program
      </button>
      <button
        type="button"
        class="btn"
        :class="{ 'btn--primary': status === 'ready' || status === 'paused' }"
        :disabled="!toggleEnabled"
        :aria-pressed="status === 'paused' ? 'true' : undefined"
        data-testid="toggle"
        @click="emit('toggle')"
      >
        {{ toggleLabel }}
      </button>
    </div>
    <div class="speed" role="group" aria-label="Race speed" data-testid="speed">
      <button
        v-for="option in SPEEDS"
        :key="option"
        type="button"
        class="speed__option"
        :class="{ 'is-active': option === speed }"
        :aria-pressed="option === speed"
        :data-speed="option"
        @click="emit('speed', option)"
      >
        {{ option }}×
      </button>
    </div>
    <p v-if="hint" class="controls__hint" data-testid="controls-hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  flex-wrap: wrap;
}
.controls__buttons {
  display: flex;
  gap: 0.5rem;
}
.controls__buttons .btn:last-child {
  min-width: 6.5rem;
}
.speed {
  display: inline-flex;
  border: 2px solid var(--ink);
  border-radius: var(--radius-s);
  overflow: hidden;
}
.speed__option {
  appearance: none;
  border: 0;
  border-left: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  font: 600 var(--step-0) / 1 var(--font-display);
  min-width: 2.6rem;
  min-height: 40px;
  cursor: pointer;
}
.speed__option:first-child {
  border-left: 0;
}
.speed__option:hover:not(.is-active) {
  background: var(--panel-sunk);
}
.speed__option.is-active {
  background: var(--ink);
  color: #fff;
}
.controls__hint {
  margin: 0;
  color: var(--muted);
  font-size: var(--step--1);
  max-width: 34ch;
}
</style>
