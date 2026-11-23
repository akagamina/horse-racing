import { expect, type Locator, type Page } from '@playwright/test'

/** Small page object for the game screen: user-visible controls only. */
export class RacePage {
  readonly generate: Locator
  readonly toggle: Locator
  readonly results: Locator
  readonly program: Locator
  readonly track: Locator

  constructor(readonly page: Page) {
    this.generate = page.getByRole('button', { name: 'Generate program' })
    this.toggle = page.getByTestId('toggle')
    this.results = page.getByTestId('results')
    this.program = page.getByTestId('program')
    this.track = page.getByTestId('race-track')
  }

  async open(query = '') {
    await this.page.goto(`./${query}#/`)
    await expect(this.page.getByRole('heading', { name: 'Horse Racing' })).toBeVisible()
  }

  /** Lane progress (0–1) of the HTML track, by lane number. */
  async laneProgress(): Promise<number[]> {
    return this.page.locator('[data-testid="html-track"] .runner').evaluateAll((nodes) =>
      nodes.map((n) => Number((n as HTMLElement).style.getPropertyValue('--p'))),
    )
  }

  async resultGroups(): Promise<number> {
    return this.results.locator('[data-round]').count()
  }

  /** Horse ids per round as listed in Program / Results. */
  async idsByRound(panel: Locator): Promise<string[][]> {
    return panel.locator('[data-round]').evaluateAll((groups) =>
      groups.map((g) => [...g.querySelectorAll('tbody tr')].map((tr) => tr.getAttribute('data-horse-id') ?? '').sort()),
    )
  }
}

/** Waits until the WebGL track has drawn (or the page fell back to HTML). */
export async function trackReady(page: Page, mode: 'webgl' | 'html' = 'webgl') {
  await expect(page.getByTestId('race-track').first()).toHaveAttribute('data-mode', mode)
  // Two frames for the first render to land on the canvas.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}
