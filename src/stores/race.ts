import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import {
  buildResult,
  createRng,
  createRunners,
  distanceAt,
  generateHorses,
  generateProgram,
  indexHorses,
  liveOrder,
  randomSeed,
  roundDuration,
  TIME_SCALE,
  type Horse,
  type Program,
  type Rng,
  type RoundResult,
  type Runner,
} from '@/domain'

export type RaceStatus = 'idle' | 'ready' | 'running' | 'paused' | 'completed'

/** Playback speeds the user can pick. 1 is the normal pace. */
export const SPEEDS = [1, 2, 4] as const
export type Speed = (typeof SPEEDS)[number]

/** Real seconds the finished field stays on screen before the next round starts. */
export const INTERMISSION_SECONDS = 1.5

/**
 * Game flow. The store owns one clock (simulated seconds into the current
 * round) and moves it only through `advance`, which the race loop calls with
 * real elapsed time. Pausing simply stops those calls from moving the clock.
 */
export const useRaceStore = defineStore('race', () => {
  let rng: Rng = createRng(0)

  const seed = ref(0)
  const horses = shallowRef<readonly Horse[]>([])
  const program = shallowRef<Program | null>(null)
  const roundIndex = ref(0)
  const runners = shallowRef<readonly Runner[]>([])
  const clock = ref(0)
  const roundFinished = ref(false)
  const results = shallowRef<readonly RoundResult[]>([])
  const status = ref<RaceStatus>('idle')
  /** Playback speed chosen by the user. It survives a new program. */
  const speed = ref<Speed>(1)
  /** Simulated seconds per real second. */
  const timeScale = computed(() => TIME_SCALE * speed.value)

  const horsesById = computed(() => indexHorses(horses.value))
  const currentRound = computed(() => program.value?.[roundIndex.value] ?? null)
  const duration = computed(() => (runners.value.length ? roundDuration(runners.value) : 0))

  const canGenerate = computed(() => status.value === 'idle' || status.value === 'ready' || status.value === 'completed')
  const canStart = computed(() => status.value === 'ready')
  const isRacing = computed(() => status.value === 'running' || status.value === 'paused')

  /** Metres covered by each runner of the current round. */
  const positions = computed<ReadonlyMap<string, number>>(() => {
    const round = currentRound.value
    const map = new Map<string, number>()
    if (!round) return map
    for (const runner of runners.value) map.set(runner.horseId, distanceAt(runner, clock.value, round.distance))
    return map
  })

  const standings = computed(() => (currentRound.value ? liveOrder(runners.value, clock.value, currentRound.value.distance) : []))

  function startSession(nextSeed: number = randomSeed()): void {
    seed.value = nextSeed
    rng = createRng(nextSeed)
    horses.value = generateHorses(rng)
    program.value = null
    results.value = []
    runners.value = []
    roundIndex.value = 0
    clock.value = 0
    roundFinished.value = false
    status.value = 'idle'
  }

  function prepareRound(index: number): void {
    const round = program.value?.[index]
    if (!round) throw new Error(`No round at index ${index}`)
    roundIndex.value = index
    runners.value = createRunners(rng, round, horsesById.value)
    clock.value = 0
    roundFinished.value = false
  }

  /** Builds a new six-round program. Keeps the session's horses, clears results. */
  function generate(): void {
    if (!canGenerate.value) return
    program.value = generateProgram(rng, horses.value)
    results.value = []
    prepareRound(0)
    status.value = 'ready'
  }

  function start(): void {
    if (status.value === 'ready') status.value = 'running'
  }

  function pause(): void {
    if (status.value === 'running') status.value = 'paused'
  }

  function resume(): void {
    if (status.value === 'paused') status.value = 'running'
  }

  /** The single toggle button: Start → Pause → Resume → Pause … */
  function toggle(): void {
    if (status.value === 'ready') start()
    else if (status.value === 'running') pause()
    else if (status.value === 'paused') resume()
  }

  /**
   * Changes how fast the clock runs, at any moment. Results do not change:
   * finish times are fixed when a round starts, speed only changes how fast
   * we play them back.
   */
  function setSpeed(next: Speed): void {
    if (SPEEDS.includes(next)) speed.value = next
  }

  /** Moves the race clock by `realSeconds`. Does nothing unless running. */
  function advance(realSeconds: number): void {
    if (status.value !== 'running' || realSeconds <= 0) return
    const round = currentRound.value
    if (!round) return

    clock.value += realSeconds * timeScale.value

    if (!roundFinished.value && clock.value >= duration.value) {
      // The tenth horse has crossed: publish the whole round at once.
      roundFinished.value = true
      results.value = [...results.value, buildResult(round, runners.value)]
    }

    // The pause between rounds is real time: the same 1.5 s at any speed.
    if (roundFinished.value && clock.value >= duration.value + INTERMISSION_SECONDS * timeScale.value) {
      const next = roundIndex.value + 1
      if (next < (program.value?.length ?? 0)) {
        prepareRound(next)
      } else {
        clock.value = duration.value
        status.value = 'completed'
      }
    }
  }

  return {
    seed,
    horses,
    program,
    roundIndex,
    runners,
    clock,
    roundFinished,
    results,
    status,
    speed,
    timeScale,
    horsesById,
    currentRound,
    duration,
    canGenerate,
    canStart,
    isRacing,
    positions,
    standings,
    startSession,
    generate,
    start,
    pause,
    resume,
    toggle,
    advance,
    setSpeed,
  }
})

export type RaceStore = ReturnType<typeof useRaceStore>
