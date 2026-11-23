<script setup lang="ts">
import type { Horse } from '@/domain'
import HorseBadge from './HorseBadge.vue'

defineProps<{
  horses: readonly Horse[]
  /** Horses running in the current round, highlighted in the list. */
  activeIds?: ReadonlySet<string>
  /** Horse in front right now, if a round is under way. */
  leaderId?: string | null
}>()
</script>

<template>
  <section class="panel roster" aria-labelledby="roster-title">
    <header class="panel__head">
      <h2 id="roster-title">Horse list</h2>
      <span class="panel__meta">{{ horses.length }} horses</span>
    </header>
    <div class="panel__body" tabindex="0" aria-label="Horse list, scrollable">
      <table class="data-table" data-testid="roster">
        <caption class="visually-hidden">
          All horses with condition and colour
        </caption>
        <thead>
          <tr>
            <th scope="col">No.</th>
            <th scope="col">Name</th>
            <th scope="col" class="num cond">Cond.</th>
            <th scope="col">Color</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="horse in horses"
            :key="horse.id"
            :class="{ 'is-active': activeIds?.has(horse.id), 'is-leader': leaderId === horse.id }"
            :data-horse-id="horse.id"
          >
            <td><HorseBadge :horse="horse" /></td>
            <th scope="row" class="name">{{ horse.name }}</th>
            <td class="num cond">
              <span class="condition">
                <span class="condition__meter" aria-hidden="true"><span :style="{ width: `${horse.condition}%` }" /></span>
                {{ horse.condition }}
              </span>
            </td>
            <td class="color">{{ horse.color.name }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.name {
  font-weight: 500;
  color: var(--ink);
  text-align: left;
  position: static;
  background: none;
  border-bottom: 1px solid #edf0ec;
  white-space: nowrap;
}
.color {
  color: var(--muted);
  white-space: nowrap;
}
tr.is-active td,
tr.is-active th {
  background: #f5f0de;
}
.condition {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  justify-content: flex-end;
}
.condition__meter {
  width: 2.2rem;
  height: 4px;
  border-radius: 2px;
  background: #e3e8e3;
  overflow: hidden;
}
.condition__meter span {
  display: block;
  height: 100%;
  background: var(--turf);
}
.cond {
  width: 5.6rem;
}
tr.is-leader td:first-child {
  box-shadow: inset 4px 0 0 var(--saffron);
}
tr.is-leader .name {
  font-weight: 600;
}
</style>
