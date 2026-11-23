import { onBeforeUnmount, watch } from 'vue'
import type { RaceStore } from '@/stores/race'

/** Longest real step taken in one frame, so a background tab cannot teleport horses. */
const MAX_STEP_SECONDS = 0.1

/**
 * The one animation loop of the game. It runs only while the store is
 * `running` and feeds real elapsed time into `store.advance`. Unmounting the
 * owner stops the loop, so leaving the page can never leave a second loop behind.
 */
export function useRaceLoop(store: RaceStore): void {
  let frame = 0
  let last = 0

  const tick = (now: number) => {
    const step = Math.min((now - last) / 1000, MAX_STEP_SECONDS)
    last = now
    store.advance(step)
    frame = store.status === 'running' ? requestAnimationFrame(tick) : 0
  }

  const stop = () => {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }

  watch(
    () => store.status,
    (status) => {
      if (status === 'running' && !frame) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      } else if (status !== 'running') {
        stop()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(stop)
}
