import { describe, expect, it } from 'vitest'
import {
  buildResult,
  createRng,
  createRunners,
  distanceAt,
  generateHorses,
  generateProgram,
  indexHorses,
  rankRunners,
  ROUND_DISTANCES,
  sample,
  shuffle,
  type Rng,
  type Runner,
} from '@/domain'

/** Replays a fixed list of values, for boundary cases. */
const scripted = (values: number[]): Rng => {
  let i = 0
  return () => values[i++ % values.length]!
}

const runner = (horseId: string, lane: number, finishTime: number): Runner => ({
  horseId, lane, finishTime, baseSpeed: 16, surgeAmplitude: 0.05, surgeFrequency: 0.1, surgePhase: 0,
})

describe('horses', () => {
  it('creates 20 horses with unique ids, names, numbers and colours', () => {
    const horses = generateHorses(createRng(1))
    expect(horses).toHaveLength(20)
    for (const key of ['id', 'name', 'number'] as const) expect(new Set(horses.map((h) => h[key])).size).toBe(20)
    expect(new Set(horses.map((h) => h.color.hex)).size).toBe(20)
  })

  it('keeps every condition an integer in [1, 100] across many seeds', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const horse of generateHorses(createRng(seed))) {
        expect(Number.isInteger(horse.condition)).toBe(true)
        expect(horse.condition).toBeGreaterThanOrEqual(1)
        expect(horse.condition).toBeLessThanOrEqual(100)
      }
    }
  })

  it('reaches both condition bounds with a controlled RNG', () => {
    const low = generateHorses(scripted([0]))
    const high = generateHorses(scripted([0.999999]))
    expect(low.every((h) => h.condition === 1)).toBe(true)
    expect(high.every((h) => h.condition === 100)).toBe(true)
  })
})

describe('random helpers', () => {
  it('shuffle and sample never mutate their input and never repeat', () => {
    const input = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const rng = createRng(3)
    expect(shuffle(rng, input).sort((a, b) => a - b)).toEqual([...input])
    const picked = sample(rng, input, 4)
    expect(new Set(picked).size).toBe(4)
    expect(() => sample(rng, input, 11)).toThrow(RangeError)
  })
})

describe('program', () => {
  const horses = generateHorses(createRng(9))
  const program = generateProgram(createRng(10), horses)

  it('has six rounds at exactly 1200…2200 m', () => {
    expect(program.map((r) => r.distance)).toEqual([...ROUND_DISTANCES])
    expect(program.map((r) => r.number)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('draws ten distinct roster horses into lanes 1–10 for every round', () => {
    const ids = new Set(horses.map((h) => h.id))
    for (const round of program) {
      expect(round.entries.map((e) => e.lane)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      expect(new Set(round.entries.map((e) => e.horseId)).size).toBe(10)
      expect(round.entries.every((e) => ids.has(e.horseId))).toBe(true)
    }
  })

  it('accepts other distances and field sizes without code changes', () => {
    const custom = generateProgram(createRng(1), horses, [1000, 3000], 8)
    expect(custom.map((r) => [r.distance, r.entries.length])).toEqual([[1000, 8], [3000, 8]])
  })

  it('is repeatable for the same seed', () => {
    const again = generateProgram(createRng(10), generateHorses(createRng(9)))
    expect(again).toEqual(program)
  })
})

describe('simulation', () => {
  const horses = generateHorses(createRng(21))
  const round = generateProgram(createRng(22), horses)[0]!
  const runners = createRunners(createRng(23), round, indexHorses(horses))

  it('moves every horse forward and stops it exactly at the line', () => {
    for (const r of runners) {
      let previous = 0
      for (let t = 0; t <= r.finishTime + 20; t += 0.5) {
        const d = distanceAt(r, t, round.distance)
        expect(d).toBeGreaterThanOrEqual(previous)
        expect(d).toBeLessThanOrEqual(round.distance)
        previous = d
      }
      expect(distanceAt(r, r.finishTime, round.distance)).toBe(round.distance)
      expect(distanceAt(r, r.finishTime - 0.01, round.distance)).toBeLessThan(round.distance)
    }
  })

  it('longer rounds take longer', () => {
    const program = generateProgram(createRng(5), horses)
    const avg = (i: number) => {
      const rs = createRunners(createRng(1), program[i]!, indexHorses(horses))
      return rs.reduce((sum, r) => sum + r.finishTime, 0) / rs.length
    }
    expect(avg(5)).toBeGreaterThan(avg(0))
  })

  it('ranks by exact crossing time, even inside one 1/60 s frame', () => {
    // Both cross between t = 70.000 and t = 70.016: the frame cannot tell them apart.
    const placings = rankRunners([runner('slow', 1, 70.012), runner('fast', 2, 70.004)])
    expect(placings.map((p) => p.horseId)).toEqual(['fast', 'slow'])
  })

  it('breaks an exact tie by the lower lane, stably', () => {
    const placings = rankRunners([runner('b', 7, 71), runner('a', 3, 71), runner('c', 5, 69)])
    expect(placings.map((p) => [p.place, p.horseId])).toEqual([[1, 'c'], [2, 'a'], [3, 'b']])
  })

  it('does not mutate the runners or the round when building a result', () => {
    const before = runners.map((r) => r.horseId)
    const entriesBefore = round.entries.map((e) => e.horseId)
    const result = buildResult(round, runners)
    expect(runners.map((r) => r.horseId)).toEqual(before)
    expect(round.entries.map((e) => e.horseId)).toEqual(entriesBefore)
    expect(result.placings.map((p) => p.place)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('does not let condition 100 win every time: form and surges matter', () => {
    const outcomes = new Set<string>()
    for (let seed = 0; seed < 60; seed++) {
      const rs = createRunners(createRng(seed), round, indexHorses(horses))
      outcomes.add(rankRunners(rs)[0]!.horseId)
    }
    expect(outcomes.size).toBeGreaterThan(2)
  })
})
