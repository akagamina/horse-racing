import { RUNNERS_PER_ROUND } from '@/domain'

/**
 * World layout of the straight. Horses run along −Z: the start line is near the
 * camera (bottom of the screen) and the finish line is far away (top).
 * Pure functions only, so the mapping is unit-tested without WebGL.
 */
export const LANE_COUNT = RUNNERS_PER_ROUND
export const LANE_WIDTH = 1.75
export const TRACK_WIDTH = LANE_COUNT * LANE_WIDTH
export const START_Z = 0
export const FINISH_Z = -40
/** Distance from a horse's origin to the tip of its nose (the model faces −Z). */
export const NOSE_OFFSET = 1.55
/** Gallop phase advances one full stride per this many simulated metres. */
export const STRIDE_METRES = 75

/** Lane 1 is on the left, lane 10 on the right. */
export function laneX(lane: number): number {
  return (lane - (LANE_COUNT + 1) / 2) * LANE_WIDTH
}

/** Z of the nose for a progress fraction (0 = start line, 1 = finish line). */
export function noseZ(progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  return START_Z + (FINISH_Z - START_Z) * p
}

/** Z of the horse origin, so the nose (not the body) touches each line. */
export function horseZ(progress: number): number {
  return noseZ(progress) + NOSE_OFFSET
}

/**
 * The leader and its progress (0–1), or null when there is no lead to show:
 * before the start, and from the moment the first horse crosses the finish.
 * The leader line is drawn in this horse's lane only. Level horses: the first
 * in the map (the lower lane) keeps the line.
 */
export function frontRunner(positions: ReadonlyMap<string, number>, distance: number): { id: string; progress: number } | null {
  if (distance <= 0) return null
  let id: string | null = null
  let front = 0
  for (const [horseId, covered] of positions) {
    if (covered >= distance) return null
    if (covered > front) {
      front = covered
      id = horseId
    }
  }
  return id === null ? null : { id, progress: front / distance }
}

/** Gallop phase in [0, 1), derived from distance only, never from wall time. */
export function gallopPhase(metres: number, offset: number): number {
  const phase = metres / STRIDE_METRES + offset
  return phase - Math.floor(phase)
}
