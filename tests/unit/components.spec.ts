import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HorseRoster from '@/components/HorseRoster.vue'
import RaceControls from '@/components/RaceControls.vue'
import RoundProgram from '@/components/RoundProgram.vue'
import RoundResults from '@/components/RoundResults.vue'
import { createFixtureStore } from '@/showroom/fixtures'
import type { RaceStatus } from '@/stores/race'

const controls = (status: RaceStatus, canGenerate: boolean) => mount(RaceControls, { props: { status, canGenerate } })
const button = (w: ReturnType<typeof controls>, id: string) => w.get(`[data-testid="${id}"]`)

describe('RaceControls', () => {
  it.each([
    ['idle', true, 'Start', false],
    ['ready', true, 'Start', true],
    ['running', false, 'Pause', true],
    ['paused', false, 'Resume', true],
    ['completed', true, 'Start', false],
  ] as const)('%s: generate %s, second button "%s" enabled %s', (status, canGenerate, label, toggleEnabled) => {
    const w = controls(status, canGenerate)
    expect(button(w, 'generate').attributes('disabled')).toBe(canGenerate ? undefined : '')
    expect(button(w, 'toggle').text()).toBe(label)
    expect(button(w, 'toggle').attributes('disabled')).toBe(toggleEnabled ? undefined : '')
  })

  it('emits the user actions', async () => {
    const w = controls('ready', true)
    await button(w, 'generate').trigger('click')
    await button(w, 'toggle').trigger('click')
    expect(w.emitted('generate')).toHaveLength(1)
    expect(w.emitted('toggle')).toHaveLength(1)
  })
})

describe('panels', () => {
  const store = createFixtureStore('after-round-1')

  it('roster lists all twenty horses with a header row', () => {
    const w = mount(HorseRoster, { props: { horses: store.horses } })
    expect(w.findAll('tbody tr')).toHaveLength(20)
    expect(w.findAll('thead th').map((th) => th.text())).toEqual(['No.', 'Name', 'Cond.', 'Color'])
  })

  it('results show an empty state before the first round', () => {
    const w = mount(RoundResults, { props: { results: [], horsesById: store.horsesById } })
    expect(w.get('[data-testid="results-empty"]').text()).toContain('tenth horse')
  })

  it('results show the published round with ten places', () => {
    const w = mount(RoundResults, { props: { results: store.results, horsesById: store.horsesById } })
    expect(w.text()).toContain('Round 1 · 1200 m')
    expect(w.findAll('[data-place]').map((r) => r.attributes('data-place'))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
  })

  it('program pairs each lane with the horse the store put there', () => {
    const w = mount(RoundProgram, { props: { program: store.program, horsesById: store.horsesById, activeRound: 2 } })
    const round2 = store.program![1]!
    const rows = w.findAll('[data-round="2"] tbody tr')
    rows.forEach((row, i) => {
      const entry = round2.entries[i]!
      expect(row.find('td').text()).toBe(String(entry.lane))
      expect(row.text()).toContain(store.horsesById.get(entry.horseId)!.name)
    })
    expect(w.get('[data-round="2"]').text()).toContain('On track')
  })
})
