<script setup lang="ts">
import type { Horse, RoundResult } from '@/domain'
import { raceTime, roundTitle } from '@/ui/format'
import HorseBadge from './HorseBadge.vue'

defineProps<{
  results: readonly RoundResult[]
  horsesById: ReadonlyMap<string, Horse>
}>()
</script>

<template>
  <section class="panel" aria-labelledby="results-title">
    <header class="panel__head">
      <h2 id="results-title">Results</h2>
      <span class="panel__meta">{{ results.length }} of 6</span>
    </header>
    <div class="panel__body" tabindex="0" aria-label="Results, scrollable" data-testid="results">
      <p v-if="results.length === 0" class="empty" data-testid="results-empty">
        Results appear here the moment the tenth horse of a round crosses the line.
      </p>
      <div v-for="result in results" :key="result.roundNumber" class="group" :data-round="result.roundNumber">
        <h3 class="group__title">{{ roundTitle(result.roundNumber, result.distance) }}</h3>
        <table class="data-table">
          <caption class="visually-hidden">{{ roundTitle(result.roundNumber, result.distance) }}, finishing order</caption>
          <thead>
            <tr>
              <th scope="col" class="num-left">Place</th>
              <th scope="col">Horse</th>
              <th scope="col" class="num">Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="placing in result.placings" :key="placing.horseId" :data-place="placing.place" :data-horse-id="placing.horseId">
              <td class="num-left place" :class="{ 'is-winner': placing.place === 1 }">{{ placing.place }}</td>
              <td>
                <span class="who">
                  <HorseBadge :horse="horsesById.get(placing.horseId)!" />
                  {{ horsesById.get(placing.horseId)?.name }}
                </span>
              </td>
              <td class="num time">{{ raceTime(placing.time) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.empty { color: var(--muted); padding: 0 0.9rem 1rem; margin: 0; max-width: 32ch; }
.group { padding: 0 0 0.6rem; }
.group__title {
  font-size: var(--step-1);
  padding: 0.45rem 0.9rem;
  background: var(--panel-sunk);
  border-top: 1px solid var(--line);
}
.num-left { width: 3rem; }
.place { font: 700 var(--step-0)/1 var(--font-display); }
.place.is-winner { color: var(--post); }
.who { display: inline-flex; align-items: center; gap: 0.45rem; }
.time { width: 4rem; color: var(--muted); }
</style>
