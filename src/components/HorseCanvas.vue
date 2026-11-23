<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Horse } from '@/domain'
import type { HorseStage, StageView } from '@/three/horseStage'
import { supportsWebGL } from '@/three/webgl'

/** One horse on its own canvas. `phase` null = standing; the parent owns time. */
const props = withDefaults(defineProps<{ horse: Horse; phase: number | null; view?: StageView; label: string }>(), { view: 'side' })

const host = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const failed = ref(false)
const ready = ref(false)
let stage: HorseStage | null = null
let observer: ResizeObserver | null = null
let disposed = false

const draw = () => stage?.render(props.phase)
const measure = () => {
  if (!stage || !host.value) return
  const { width, height } = host.value.getBoundingClientRect()
  stage.resize(width, height)
  draw()
}

onMounted(async () => {
  if (!supportsWebGL()) {
    failed.value = true
    return
  }
  try {
    await document.fonts?.load('700 70px "Barlow Condensed"').catch(() => undefined)
    const { HorseStage } = await import('@/three/horseStage')
    if (disposed || !canvas.value) return
    stage = new HorseStage(canvas.value, props.view)
    stage.setHorse(props.horse)
    measure()
    ready.value = true
    observer = new ResizeObserver(measure)
    if (host.value) observer.observe(host.value)
  } catch {
    failed.value = true
  }
})

watch(
  () => props.horse,
  (horse) => {
    stage?.setHorse(horse)
    draw()
  },
)
watch(() => props.phase, draw)

onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  stage?.dispose()
  stage = null
})
</script>

<template>
  <div ref="host" class="horse-canvas" :data-ready="ready" data-testid="horse-canvas">
    <canvas v-show="!failed" ref="canvas" role="img" :aria-label="label" />
    <p v-if="failed" class="horse-canvas__fallback">3D preview needs WebGL, which this browser does not offer.</p>
  </div>
</template>

<style scoped>
.horse-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  background: #dce7e4;
  border-radius: var(--radius-m);
  overflow: hidden;
}
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.horse-canvas__fallback {
  padding: 1rem;
  color: var(--muted);
}
</style>
