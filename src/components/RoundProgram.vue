<script setup lang="ts">
import type { Horse, Program } from '@/domain'
import { roundTitle } from '@/ui/format'
import HorseBadge from './HorseBadge.vue'

defineProps<{
  program: Program | null
  horsesById: ReadonlyMap<string, Horse>
  /** Highlights the round on the track; null when nothing is running. */
  activeRound?: number | null
}>()
</script>

<template>
  <section class="panel" aria-labelledby="program-title">
    <header class="panel__head">
      <h2 id="program-title">Program</h2>
      <span v-if="program" class="panel__meta">6 rounds</span>
    </header>
    <div class="panel__body" tabindex="0" aria-label="Program, scrollable" data-testid="program">
      <p v-if="!program" class="empty">No program yet. Press Generate program to draw the six rounds.</p>
      <div
        v-for="round in program ?? []"
        :key="round.number"
        class="group"
        :class="{ 'is-active': activeRound === round.number }"
        :data-round="round.number"
      >
        <h3 class="group__title">
          {{ roundTitle(round.number, round.distance) }}
          <span v-if="activeRound === round.number" class="tag">On track</span>
        </h3>
        <table class="data-table">
          <caption class="visually-hidden">{{ roundTitle(round.number, round.distance) }}, starting lanes</caption>
          <thead>
            <tr><th scope="col" class="num-left">Lane</th><th scope="col">Horse</th></tr>
          </thead>
          <tbody>
            <tr v-for="entry in round.entries" :key="entry.lane" :data-lane="entry.lane" :data-horse-id="entry.horseId">
              <td class="num-left">{{ entry.lane }}</td>
              <td>
                <span class="who">
                  <HorseBadge :horse="horsesById.get(entry.horseId)!" />
                  {{ horsesById.get(entry.horseId)?.name }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.empty { color: var(--muted); padding: 0 0.9rem 1rem; margin: 0; }
.group { padding: 0 0 0.6rem; }
.group__title {
  font-size: var(--step-1);
  padding: 0.45rem 0.9rem;
  background: var(--panel-sunk);
  border-top: 1px solid var(--line);
  display: flex; align-items: center; justify-content: space-between;
}
.group.is-active .group__title { background: #f5f0de; box-shadow: inset 4px 0 0 var(--saffron); }
.tag { font: 600 var(--step--1)/1 var(--font-body); color: var(--ink); }
.num-left { width: 3rem; }
.who { display: inline-flex; align-items: center; gap: 0.45rem; }
</style>
