<script setup lang="ts">
import { ref } from 'vue'
import RaceBoard from '@/components/RaceBoard.vue'
import { createFixtureStore, type FixtureSlug } from '@/showroom/fixtures'

const props = defineProps<{ slug: string }>()
const store = createFixtureStore(props.slug as FixtureSlug)

// The running example opens on a fixed frame; Play preview lets it run on.
const live = ref(props.slug !== 'running')
</script>

<template>
  <div class="state-example">
    <p v-if="slug === 'running' && !live" class="preview-bar">
      <button type="button" class="btn btn--primary" data-testid="play-preview" @click="live = true">Play preview</button>
      <span>Starts this copy of the race from the frame shown. The game itself is untouched.</span>
    </p>
    <div class="board-frame">
      <RaceBoard :key="String(live)" :store="store" :drive="live" />
    </div>
  </div>
</template>

<style scoped>
.preview-bar {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  margin: 0 0 0.8rem;
  color: var(--muted);
  font-size: var(--step--1);
  flex-wrap: wrap;
}
.board-frame {
  border: 1px solid var(--line);
  border-radius: var(--radius-m);
  overflow: hidden;
  background: var(--paper);
}
.board-frame :deep(.board) {
  min-height: 0;
}
.board-frame :deep(.board__bar) {
  position: static;
}
@media (min-width: 1180px) {
  .board-frame :deep(.board) {
    height: 820px;
  }
}
</style>
