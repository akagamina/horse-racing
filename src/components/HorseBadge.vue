<script setup lang="ts">
import { computed } from 'vue'
import type { Horse } from '@/domain'
import { readableInk } from '@/ui/color'

const props = withDefaults(defineProps<{ horse: Horse; size?: 'sm' | 'md' }>(), { size: 'sm' })
const style = computed(() => ({ background: props.horse.color.hex, color: readableInk(props.horse.color.hex) }))
</script>

<template>
  <span class="badge" :class="`badge--${size}`" :style="style" :title="`${horse.color.name} silks, number ${horse.number}`">
    {{ horse.number }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-grid;
  place-items: center;
  flex: none;
  font: 700 0.85rem/1 var(--font-display);
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px rgb(0 0 0 / 0.22);
}
.badge--sm { width: 1.45rem; height: 1.45rem; }
.badge--md { width: 2rem; height: 2rem; font-size: 1.05rem; }
</style>
