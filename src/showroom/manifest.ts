import { FIXTURE_SEED } from './fixtures'
import { generateHorses, createRng } from '@/domain'

export type ShowroomKind = 'screens' | 'states' | 'components' | 'visuals' | 'horses'

export interface ShowroomEntry {
  readonly kind: ShowroomKind
  readonly slug: string
  readonly title: string
  /** One sentence: what to look at on this page. */
  readonly hint: string
}

/** The fixture horses: the same twenty on every showroom page. */
export const FIXTURE_HORSES = generateHorses(createRng(FIXTURE_SEED))

export const SHOWROOM_GROUPS: readonly { kind: ShowroomKind; title: string; blurb: string }[] = [
  { kind: 'screens', title: 'Screens', blurb: 'The whole game screen with every region filled.' },
  { kind: 'states', title: 'States', blurb: 'The board at each step of a six-round race.' },
  { kind: 'components', title: 'Components', blurb: 'Each Vue component on its own, with real fixture data.' },
  { kind: 'visuals', title: 'Visuals', blurb: 'The 3D horse and every drawing the app uses.' },
  { kind: 'horses', title: 'Horses', blurb: 'All twenty fixture horses, one page each.' },
]

export const SHOWROOM: readonly ShowroomEntry[] = [
  {
    kind: 'screens',
    slug: 'race-board',
    title: 'Race board',
    hint: 'Round 2 frozen mid-race with round 1 already in Results: roster left, track centre, program and results right.',
  },

  {
    kind: 'states',
    slug: 'idle',
    title: 'Idle',
    hint: 'Twenty horses listed, empty program and results, Start disabled until a program exists.',
  },
  { kind: 'states', slug: 'ready', title: 'Ready', hint: 'Six rounds drawn and the ten horses of round 1 standing at the start line.' },
  {
    kind: 'states',
    slug: 'running',
    title: 'Running',
    hint: 'A fixed moment four seconds into round 1; Play preview lets this copy run on.',
  },
  {
    kind: 'states',
    slug: 'paused',
    title: 'Paused',
    hint: 'Horses frozen mid-stride with Resume ready; the clock does not move while paused.',
  },
  {
    kind: 'states',
    slug: 'after-round-1',
    title: 'After round 1',
    hint: 'Round 1 published in Results, round 2 at the gate, later rounds still empty.',
  },
  {
    kind: 'states',
    slug: 'completed',
    title: 'Completed',
    hint: 'Six result groups, sixty rows, and Generate program ready for a new race.',
  },

  {
    kind: 'components',
    slug: 'controls',
    title: 'Controls',
    hint: 'The two buttons in every game state: which is enabled and what the second one says.',
  },
  {
    kind: 'components',
    slug: 'horse-roster',
    title: 'Horse roster',
    hint: 'Number badge, name, condition with its bar, and colour name for all twenty horses.',
  },
  {
    kind: 'components',
    slug: 'race-track',
    title: 'Race track',
    hint: 'The 3D straight with lane labels at the start, the finish post and the live order strip.',
  },
  {
    kind: 'components',
    slug: 'round-program',
    title: 'Round program',
    hint: 'Lane-by-lane line-ups for six rounds, with the round on the track marked.',
  },
  {
    kind: 'components',
    slug: 'round-results',
    title: 'Round results',
    hint: 'The empty state, then published rounds with place, horse and race time.',
  },

  {
    kind: 'visuals',
    slug: 'galloping-horse',
    title: 'Galloping horse',
    hint: 'The procedural horse at track scale and close up: play, pause or scrub the gallop.',
  },
  {
    kind: 'visuals',
    slug: 'silks-lineup',
    title: 'Silks line-up',
    hint: 'All twenty colour and number combinations side by side, drawn from the one shared model.',
  },
  {
    kind: 'visuals',
    slug: 'html-track',
    title: 'HTML fallback track',
    hint: 'What browsers without WebGL get: the same race data on a flat, numbered track.',
  },

  ...FIXTURE_HORSES.map((horse) => ({
    kind: 'horses' as const,
    slug: horse.id,
    title: `${horse.number}. ${horse.name}`,
    hint: 'Saddle-cloth colour and number as they appear in the race, in the close-up and at track scale.',
  })),
]

export function findEntry(kind: string, slug: string): ShowroomEntry | undefined {
  return SHOWROOM.find((entry) => entry.kind === kind && entry.slug === slug)
}

export function entryPath(entry: Pick<ShowroomEntry, 'kind' | 'slug'>): string {
  return `/showroom/${entry.kind}/${entry.slug}`
}
