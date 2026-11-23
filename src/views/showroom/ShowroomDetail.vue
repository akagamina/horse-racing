<script setup lang="ts">
import { computed } from 'vue'
import { findEntry, SHOWROOM_GROUPS } from '@/showroom/manifest'
import ComponentExample from './ComponentExample.vue'
import HorseExample from './HorseExample.vue'
import ShowroomFrame from './ShowroomFrame.vue'
import StateExample from './StateExample.vue'
import VisualExample from './VisualExample.vue'

const props = defineProps<{ kind: string; slug: string }>()
const entry = computed(() => findEntry(props.kind, props.slug))
const kindTitle = computed(() => SHOWROOM_GROUPS.find((g) => g.kind === props.kind)?.title)
</script>

<template>
  <ShowroomFrame v-if="entry" :key="`${kind}/${slug}`" :title="entry.title" :hint="entry.hint" :kind-title="kindTitle">
    <StateExample v-if="entry.kind === 'states' || entry.kind === 'screens'" :slug="entry.slug" />
    <ComponentExample v-else-if="entry.kind === 'components'" :slug="entry.slug" />
    <VisualExample v-else-if="entry.kind === 'visuals'" :slug="entry.slug" />
    <HorseExample v-else :horse-id="entry.slug" />
  </ShowroomFrame>
  <ShowroomFrame v-else title="No such showroom page" kind-title="Unknown">
    <p data-testid="showroom-missing">
      There is no showroom page at <code>{{ kind }}/{{ slug }}</code>. Pick one from the
      <RouterLink to="/showroom">showroom index</RouterLink>.
    </p>
  </ShowroomFrame>
</template>
