export type HorseId = string

export interface SilkColor {
  readonly name: string
  readonly hex: string
}

export interface Horse {
  readonly id: HorseId
  /** Saddle-cloth number, stable for the whole session (1–20). */
  readonly number: number
  readonly name: string
  readonly color: SilkColor
  /** Integer in [1, 100]. */
  readonly condition: number
}

export interface Entry {
  /** 1-based lane: the horse's starting position in this round. */
  readonly lane: number
  readonly horseId: HorseId
}

export interface Round {
  /** 1-based round number. */
  readonly number: number
  readonly distance: number
  readonly entries: readonly Entry[]
}

export type Program = readonly Round[]

/** Pace profile of one runner in one round, fixed when the round starts. */
export interface Runner {
  readonly horseId: HorseId
  readonly lane: number
  /** Average speed in metres per simulated second. */
  readonly baseSpeed: number
  /** Relative amplitude of the surge wave, 0 ≤ a < 1. */
  readonly surgeAmplitude: number
  /** Surge angular frequency in radians per simulated second. */
  readonly surgeFrequency: number
  readonly surgePhase: number
  /** Simulated seconds needed to cover the round distance. */
  readonly finishTime: number
}

export interface Placing {
  readonly place: number
  readonly horseId: HorseId
  readonly lane: number
  /** Simulated seconds from the start to the finish line. */
  readonly time: number
}

export interface RoundResult {
  readonly roundNumber: number
  readonly distance: number
  readonly placings: readonly Placing[]
}
