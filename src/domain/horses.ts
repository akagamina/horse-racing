import { HORSE_NAMES } from './names'
import { SILK_PALETTE } from './palette'
import { CONDITION_MAX, CONDITION_MIN, HORSE_COUNT } from './rules'
import { randomInt, sample, type Rng } from './rng'
import type { Horse } from './types'

/** Builds the session's horses: unique ids, names and colours; random condition. */
export function generateHorses(rng: Rng, count: number = HORSE_COUNT): Horse[] {
  const names = sample(rng, HORSE_NAMES, count)
  const colors = sample(rng, SILK_PALETTE, count)
  return names.map((name, index) => ({
    id: `h${String(index + 1).padStart(2, '0')}`,
    number: index + 1,
    name,
    color: colors[index]!,
    condition: randomInt(rng, CONDITION_MIN, CONDITION_MAX),
  }))
}

export function indexHorses(horses: readonly Horse[]): ReadonlyMap<string, Horse> {
  return new Map(horses.map((horse) => [horse.id, horse]))
}
