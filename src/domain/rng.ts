/** A source of uniformly distributed numbers in [0, 1). */
export type Rng = () => number

/** Small, fast, seedable PRNG (mulberry32). Same seed → same sequence. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

/** Integer in [min, max], both inclusive. */
export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function randomBetween(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min)
}

/** Fisher–Yates on a copy; the input is never mutated. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = copy[i] as T
    copy[i] = copy[j] as T
    copy[j] = tmp
  }
  return copy
}

/** Picks `count` distinct items. */
export function sample<T>(rng: Rng, items: readonly T[], count: number): T[] {
  if (count > items.length) throw new RangeError(`Cannot pick ${count} of ${items.length}`)
  return shuffle(rng, items).slice(0, count)
}
