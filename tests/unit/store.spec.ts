import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { INTERMISSION_SECONDS, useRaceStore } from '@/stores/race'

const FRAME = 1 / 60

function newStore(seed = 42) {
  setActivePinia(createPinia())
  const store = useRaceStore()
  store.startSession(seed)
  return store
}

/** Advance in fixed frames until `done` or a safety limit. */
function runUntil(store: ReturnType<typeof newStore>, done: () => boolean, step = FRAME) {
  for (let i = 0; i < 200_000 && !done(); i++) store.advance(step)
}

describe('race store', () => {
  let store: ReturnType<typeof newStore>
  beforeEach(() => {
    store = newStore()
  })

  it('starts idle with 20 horses and nothing else', () => {
    expect(store.status).toBe('idle')
    expect(store.horses).toHaveLength(20)
    expect(store.program).toBeNull()
    expect(store.results).toEqual([])
  })

  it('ignores Start and advance before a program exists', () => {
    store.start()
    store.toggle()
    store.advance(5)
    expect(store.status).toBe('idle')
    expect(store.clock).toBe(0)
  })

  it('Generate prepares round 1; Generate again redraws while still ready', () => {
    store.generate()
    expect(store.status).toBe('ready')
    const first = store.program
    store.generate()
    expect(store.program).not.toBe(first)
    expect(store.horses).toHaveLength(20)
  })

  it('ignores Generate while running or paused; five Starts still make one race', () => {
    store.generate()
    const program = store.program
    for (let i = 0; i < 5; i++) store.start()
    store.generate()
    expect(store.program).toBe(program)
    store.pause()
    store.generate()
    expect(store.program).toBe(program)
    expect(store.status).toBe('paused')
  })

  it('freezes clock, positions and results while paused, then resumes from there', () => {
    store.generate()
    store.start()
    store.advance(2)
    store.pause()
    const clock = store.clock
    const positions = new Map(store.positions)
    for (let i = 0; i < 10_000; i++) store.advance(1)
    expect(store.clock).toBe(clock)
    expect(new Map(store.positions)).toEqual(positions)
    expect(store.results).toHaveLength(0)
    store.resume()
    store.advance(0.1)
    expect(store.clock).toBeGreaterThan(clock)
  })

  it('publishes nothing at nine finishers and exactly one group at ten', () => {
    store.generate()
    store.start()
    const times = store.runners.map((r) => r.finishTime).sort((a, b) => a - b)
    runUntil(store, () => store.clock >= times[8]!)
    expect(store.clock).toBeLessThan(times[9]!)
    expect(store.results).toHaveLength(0)
    runUntil(store, () => store.results.length > 0)
    expect(store.results).toHaveLength(1)
    // Still showing round 1 during the short intermission, no duplicate result.
    store.advance(INTERMISSION_SECONDS / 2)
    expect(store.results).toHaveLength(1)
    expect(store.roundIndex).toBe(0)
  })

  it('runs all six rounds in order, then stops with 6 × 10 results', () => {
    store.generate()
    store.start()
    runUntil(store, () => store.status === 'completed')
    expect(store.results.map((r) => r.distance)).toEqual([1200, 1400, 1600, 1800, 2000, 2200])
    expect(store.results.flatMap((r) => r.placings)).toHaveLength(60)
    store.results.forEach((result, i) => {
      const entered = store.program![i]!.entries.map((e) => e.horseId).sort()
      expect(result.placings.map((p) => p.horseId).sort()).toEqual(entered)
    })
    const after = store.results
    store.advance(100)
    expect(store.results).toBe(after)
    expect(store.status).toBe('completed')
  })

  it('gives the same results at 30 fps and 144 fps', () => {
    const at = (fps: number) => {
      const s = newStore(7)
      s.generate()
      s.start()
      runUntil(s, () => s.status === 'completed', 1 / fps)
      return s.results.map((r) => r.placings.map((p) => p.horseId))
    }
    expect(at(30)).toEqual(at(144))
  })

  it('is fully repeatable: same seed and same elapsed time → same state', () => {
    const snapshot = (seed: number) => {
      const s = newStore(seed)
      s.generate()
      s.start()
      for (let i = 0; i < 300; i++) s.advance(FRAME)
      return { program: s.program, positions: [...s.positions], clock: s.clock }
    }
    expect(snapshot(99)).toEqual(snapshot(99))
  })

  it('a new program after completion clears results and keeps the same horses', () => {
    store.generate()
    store.start()
    runUntil(store, () => store.status === 'completed')
    const horses = store.horses
    store.generate()
    expect(store.status).toBe('ready')
    expect(store.results).toEqual([])
    expect(store.roundIndex).toBe(0)
    expect(store.horses).toBe(horses)
  })
})
