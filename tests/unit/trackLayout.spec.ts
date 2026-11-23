import { describe, expect, it } from 'vitest'
import { FINISH_Z, gallopPhase, horseZ, LANE_WIDTH, laneX, NOSE_OFFSET, noseZ, START_Z } from '@/three/trackLayout'

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
})
