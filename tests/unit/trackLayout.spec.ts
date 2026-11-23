import { describe, expect, it } from 'vitest'
import {
  FINISH_Z,
  dustTrail,
  DUST_PUFFS,
  DUST_SPACING,
  frontRunner,
  gallopPhase,
  horseZ,
  LANE_WIDTH,
  laneX,
  NOSE_OFFSET,
  noseZ,
  START_Z,
} from '@/three/trackLayout'

describe('track layout', () => {
  it('maps start, middle and finish to the right Z, nose on the line', () => {
    expect(noseZ(0)).toBe(START_Z)
    expect(noseZ(0.5)).toBeCloseTo((START_Z + FINISH_Z) / 2)
    expect(noseZ(1)).toBe(FINISH_Z)
    expect(horseZ(1) - NOSE_OFFSET).toBe(FINISH_Z)
  })

  it('clamps progress outside [0, 1] so a horse never passes the finish', () => {
    expect(noseZ(1.4)).toBe(FINISH_Z)
    expect(noseZ(-0.2)).toBe(START_Z)
  })

  it('spaces lanes evenly and symmetrically, lane 1 on the left', () => {
    expect(laneX(1)).toBeLessThan(laneX(10))
    expect(laneX(2) - laneX(1)).toBeCloseTo(LANE_WIDTH)
    expect(laneX(1)).toBeCloseTo(-laneX(10))
  })

  it('derives the gallop phase from distance only', () => {
    expect(gallopPhase(300, 0.2)).toBe(gallopPhase(300, 0.2))
    expect(gallopPhase(0, 0.25)).toBeCloseTo(0.25)
    const p = gallopPhase(1234.5, 0.9)
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThan(1)
  })

  const field = (...metres: number[]) => new Map(metres.map((m, i) => [`h${i + 1}`, m]))

  it('puts the leader line on the horse in front, and only that horse', () => {
    expect(frontRunner(field(300, 450, 120), 1200)).toEqual({ id: 'h2', progress: 450 / 1200 })
  })

  it('keeps the line on the lower lane when two horses are level', () => {
    expect(frontRunner(field(400, 400), 1200)?.id).toBe('h1')
  })

  it('hides the leader line before the start', () => {
    expect(frontRunner(field(0, 0, 0), 1200)).toBeNull()
    expect(frontRunner(field(), 1200)).toBeNull()
    expect(frontRunner(field(100), 0)).toBeNull()
  })

  it('hides the leader line once the first horse has crossed, and never moves it to another horse', () => {
    expect(frontRunner(field(1200, 1100, 900), 1200)).toBeNull()
  })

  it('kicks up no dust before the start', () => {
    expect(dustTrail(0)).toEqual([])
  })

  it('keeps a short trail of puffs behind the runner, newest first, ageing with distance', () => {
    const puffs = dustTrail(10)
    expect(puffs).toHaveLength(DUST_PUFFS)
    expect(puffs.every((p) => p.at <= 10 && p.age >= 0 && p.age < 1)).toBe(true)
    expect(puffs.map((p) => p.age)).toEqual([...puffs.map((p) => p.age)].sort((a, b) => a - b))
  })

  it('draws the same dust for the same distance, so a paused race is frozen', () => {
    expect(dustTrail(12.34)).toEqual(dustTrail(12.34))
    // One spacing further on, the newest puff is still in the same spot, a step older.
    const now = dustTrail(12.34)[0]!
    const later = dustTrail(12.34 + DUST_SPACING)[1]!
    expect(later.seed).toBe(now.seed)
    expect(later.at).toBeCloseTo(now.at)
    expect(later.age).toBeCloseTo(now.age + 1 / DUST_PUFFS)
  })
})
