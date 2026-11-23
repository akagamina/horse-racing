import { createPinia } from 'pinia'
import { useRaceStore, type RaceStore } from '@/stores/race'

/** Every showroom page is built from this seed, so pages and screenshots never drift. */
export const FIXTURE_SEED = 20260611

export const STATE_SLUGS = ['idle', 'ready', 'running', 'paused', 'after-round-1', 'completed'] as const
export type StateSlug = (typeof STATE_SLUGS)[number]
export type FixtureSlug = StateSlug | 'race-board'

const FRAME = 1 / 60

/** Steps the store like the real loop would, one 60 fps frame at a time. */
export function runFor(store: RaceStore, realSeconds: number): void {
  const frames = Math.round(realSeconds / FRAME)
  for (let i = 0; i < frames && store.status === 'running'; i++) store.advance(FRAME)
}

export function runUntil(store: RaceStore, done: () => boolean, limitSeconds = 300): void {
  for (let i = 0; i < limitSeconds / FRAME && store.status === 'running' && !done(); i++) store.advance(FRAME)
}

/**
 * A fresh, isolated store in the requested state. Each call gets its own
 * Pinia instance, so a showroom page can never touch the live game.
 */
export function createFixtureStore(slug: FixtureSlug): RaceStore {
  const store = useRaceStore(createPinia())
  store.startSession(FIXTURE_SEED)
  if (slug === 'idle') return store

  store.generate()
  if (slug === 'ready') return store

  store.start()
  switch (slug) {
    case 'running':
      runFor(store, 4)
      break
    case 'paused':
      runFor(store, 4.5)
      store.pause()
      break
    case 'after-round-1':
      runUntil(store, () => store.roundIndex === 1)
      store.pause()
      break
    case 'race-board':
      runUntil(store, () => store.roundIndex === 1)
      runFor(store, 5)
      store.pause()
      break
    case 'completed':
      runUntil(store, () => store.status === 'completed', 600)
      break
  }
  return store
}
