import { ROUND_DISTANCES, RUNNERS_PER_ROUND } from './rules'
import { sample, type Rng } from './rng'
import type { Horse, Program } from './types'

/**
 * Six rounds at the fixed distances. Each round draws ten different horses from
 * the pool; the draw order is the lane order. A horse may run in several rounds.
 */
export function generateProgram(
  rng: Rng,
  horses: readonly Horse[],
  distances: readonly number[] = ROUND_DISTANCES,
  runnersPerRound: number = RUNNERS_PER_ROUND,
): Program {
  return distances.map((distance, index) => ({
    number: index + 1,
    distance,
    entries: sample(rng, horses, runnersPerRound).map((horse, lane) => ({
      lane: lane + 1,
      horseId: horse.id,
    })),
  }))
}
