import { onBeforeUnmount, ref } from 'vue'

/** Local gallop phase for showroom previews: play, pause and scrub. */
export function useGallopClock(stridesPerSecond = 2.3, initial = 0.62) {
  const phase = ref(initial)
  const playing = ref(false)
  let frame = 0
  let last = 0

  const tick = (now: number) => {
    phase.value = (phase.value + ((now - last) / 1000) * stridesPerSecond) % 1
    last = now
    frame = requestAnimationFrame(tick)
  }
  const play = () => {
    if (playing.value) return
    playing.value = true
    last = performance.now()
    frame = requestAnimationFrame(tick)
  }
  const pause = () => {
    playing.value = false
    cancelAnimationFrame(frame)
    frame = 0
  }
  const seek = (value: number) => {
    pause()
    phase.value = ((value % 1) + 1) % 1
  }

  onBeforeUnmount(pause)
  return { phase, playing, play, pause, seek }
}
