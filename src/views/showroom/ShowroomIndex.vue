<script setup lang="ts">
import { entryPath, SHOWROOM, SHOWROOM_GROUPS } from '@/showroom/manifest'
import ShowroomFrame from './ShowroomFrame.vue'
import ShowroomThumb from './ShowroomThumb.vue'
</script>

<template>
  <ShowroomFrame
    title="Showroom"
    hint="Every screen, state, component and drawing of the game at its own address, built from one fixed seed so it looks the same every visit."
  >
    <section v-for="group in SHOWROOM_GROUPS" :key="group.kind" class="group" :aria-labelledby="`group-${group.kind}`">
      <h2 :id="`group-${group.kind}`">{{ group.title }}</h2>
      <p class="group__blurb">{{ group.blurb }}</p>
      <ul class="grid" :class="{ 'grid--dense': group.kind === 'horses' }">
        <li v-for="entry in SHOWROOM.filter((e) => e.kind === group.kind)" :key="entry.slug">
          <RouterLink :to="entryPath(entry)" class="card" :data-testid="`showroom-link-${entry.kind}-${entry.slug}`">
            <ShowroomThumb :entry="entry" />
            <span class="card__title">{{ entry.title }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </ShowroomFrame>
</template>

<style scoped>
.group {
  margin-bottom: 2rem;
}
.group h2 {
  font-size: var(--step-2);
}
.group__blurb {
  margin: 0.2rem 0 0.8rem;
  color: var(--muted);
}
.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
}
.grid--dense {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}
.card {
  display: block;
  text-decoration: none;
  color: var(--ink);
}
.card:hover .card__title {
  text-decoration: underline;
}
.card__title {
  display: block;
  margin-top: 0.35rem;
  font-weight: 600;
}
</style>
