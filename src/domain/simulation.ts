import { CONDITION_MAX } from './rules'
import { randomBetween, type Rng } from './rng'
import type { Horse, Placing, Round, RoundResult, Runner } from './types'

/** Simulated seconds per real second. 1200 m takes ~70 s simulated, ~7 s on screen. */
export const TIME_SCALE = 10

const MIN_SPEED = 15 // m/s, condition 1, average form
const CONDITION_BONUS = 3 // m/s added at condition 100
const FORM_SPREAD = 1 // ± m/s of daily form

/**
 * Pace model: base speed = 15 + 3 · condition/100 + form(±1) m/s.
 * Each horse also surges and fades on a gentle sine wave so the field shuffles
 * during the race; the wave never makes speed negative.
 *
 *   v(t) = b · (1 + a · sin(ωt + φ))
 *   d(t) = b · (t − (a/ω)(cos(ωt + φ) − cos φ))
 */
export function createRunners(rng: Rng, round: Round, horses: ReadonlyMap<string, Horse>): Runner[] {
  return round.entries.map((entry) => {
    const horse = horses.get(entry.horseId)
    if (!horse) throw new Error(`Unknown horse ${entry.horseId}`)
    const baseSpeed =
      MIN_SPEED + (CONDITION_BONUS * horse.condition) / CONDITION_MAX + randomBetween(rng, -FORM_SPREAD, FORM_SPREAD)
    const surgeAmplitude = randomBetween(rng, 0.04, 0.12)
    const surgeFrequency = randomBetween(rng, 0.08, 0.2)
    const surgePhase = randomBetween(rng, 0, Math.PI * 2)
    const partial = { horseId: entry.horseId, lane: entry.lane, baseSpeed, surgeAmplitude, surgeFrequency, surgePhase }
    return { ...partial, finishTime: solveFinishTime(partial, round.distance) }
  })
}

type Pace = Omit<Runner, 'finishTime' | 'horseId' | 'lane'>

/** Metres covered after `t` simulated seconds, not clamped. */
export function rawDistanceAt(pace: Pace, t: number): number {
  if (t <= 0) return 0
  const { baseSpeed: b, surgeAmplitude: a, surgeFrequency: w, surgePhase: p } = pace
  return b * (t - (a / w) * (Math.cos(w * t + p) - Math.cos(p)))
}

/** Metres covered, clamped to the round distance (horses stop at the line). */
export function distanceAt(runner: Runner, t: number, distance: number): number {
  return t >= runner.finishTime ? distance : Math.min(distance, rawDistanceAt(runner, t))
}

/** Distance is strictly increasing in t, so bisection finds the crossing time. */
function solveFinishTime(pace: Pace, distance: number): number {
  const slowest = pace.baseSpeed * (1 - pace.surgeAmplitude)
  let low = 0
  let high = distance / slowest + 1
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2
    if (rawDistanceAt(pace, mid) >= distance) high = mid
    else low = mid
  }
  return high
}

/** Time at which the last runner crosses the line. */
export function roundDuration(runners: readonly Runner[]): number {
  return Math.max(...runners.map((runner) => runner.finishTime))
}

/**
 * Finishing order by the exact crossing time, so two horses that cross within
 * the same animation frame still place correctly. An exact tie goes to the
 * lower lane, which keeps the order stable.
 */
export function rankRunners(runners: readonly Runner[]): Placing[] {
  return [...runners]
    .sort((x, y) => x.finishTime - y.finishTime || x.lane - y.lane)
    .map((runner, index) => ({ place: index + 1, horseId: runner.horseId, lane: runner.lane, time: runner.finishTime }))
}

export function buildResult(round: Round, runners: readonly Runner[]): RoundResult {
  return { roundNumber: round.number, distance: round.distance, placings: rankRunners(runners) }
}

/** Live order on the track at time t: furthest first, finished horses by finish time. */
export function liveOrder(runners: readonly Runner[], t: number, distance: number): string[] {
  return [...runners]
    .map((runner) => ({ runner, covered: distanceAt(runner, t, distance) }))
    .sort((x, y) => {
      const xDone = t >= x.runner.finishTime
      const yDone = t >= y.runner.finishTime
      if (xDone && yDone) return x.runner.finishTime - y.runner.finishTime || x.runner.lane - y.runner.lane
      return y.covered - x.covered || x.runner.lane - y.runner.lane
    })
    .map(({ runner }) => runner.horseId)
}
