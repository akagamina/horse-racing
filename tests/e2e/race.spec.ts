import { expect, test, type Page } from '@playwright/test'
import { RacePage, trackReady } from '../support/race-page'

test.describe('race flow', () => {
  test('Generate → Start → move → Pause → Resume → results → six rounds → Generate again', async ({ page }) => {
    // Plays all six rounds frame by frame on the fake clock: slow on CI's software renderer.
    test.slow()
    // Fake clock: the test decides how much time passes, never a real sleep.
    await page.clock.install()
    const race = new RacePage(page)
    await race.open('?seed=7&track=html')

    await expect(race.toggle).toBeDisabled()
    await expect(page.getByTestId('results-empty')).toBeVisible()
    await race.generate.click()
    await expect(race.toggle).toHaveText('Start')
    await expect(race.program.locator('[data-round]')).toHaveCount(6)

    await race.toggle.click()
    await expect(race.generate).toBeDisabled()
    await expect(race.toggle).toHaveText('Pause')
    const before = await race.laneProgress()
    await page.clock.runFor(1500)
    const after = await race.laneProgress()
    const moved = after.filter((p, i) => p > before[i]!).length
    expect(moved).toBeGreaterThanOrEqual(2)

    await race.toggle.click()
    await expect(race.toggle).toHaveText('Resume')
    const frozen = await race.laneProgress()
    await page.clock.runFor(10_000)
    expect(await race.laneProgress()).toEqual(frozen)
    await expect(page.getByTestId('announcer')).toHaveText('Race paused.')

    await race.toggle.click()
    await expect(race.toggle).toHaveText('Pause')
    await page.clock.runFor(12_000)
    await expect.poll(() => race.resultGroups()).toBeGreaterThanOrEqual(1)
    await expect(race.results.locator('[data-round="1"] [data-place]')).toHaveCount(10)

    // Rounds start by themselves until all six are done.
    for (let i = 0; i < 12 && (await race.resultGroups()) < 6; i++) await page.clock.runFor(10_000)
    await expect(race.results.locator('[data-round]')).toHaveCount(6)
    await expect(race.results.locator('[data-place]')).toHaveCount(60)
    await expect(race.generate).toBeEnabled()
    await expect(race.toggle).toBeDisabled()

    // Each result group holds exactly the ten horses the program put in that round.
    expect(await race.idsByRound(race.results)).toEqual(await race.idsByRound(race.program))
    await expect(race.results.locator('[data-round]').nth(5)).toContainText('Round 6 · 2200 m')

    // Nothing moves after the last round.
    await page.clock.runFor(10_000)
    await expect(race.results.locator('[data-round]')).toHaveCount(6)

    await race.generate.click()
    await expect(page.getByTestId('results-empty')).toBeVisible()
    await expect(page.getByTestId('roster').locator('tbody tr')).toHaveCount(20)
  })

  test('double clicks never start a second loop or duplicate a result', async ({ page }) => {
    await page.clock.install()
    const race = new RacePage(page)
    await race.open('?seed=3&track=html')
    await race.generate.click()
    // Five clicks inside one task: Start, Pause, Resume, Pause, Resume.
    await race.toggle.evaluate((button) => {
      for (let i = 0; i < 5; i++) (button as HTMLButtonElement).click()
    })
    await expect(race.toggle).toHaveText('Pause')
    await page.clock.runFor(14_000)
    await expect.poll(() => race.resultGroups()).toBe(1)
  })

  test('smoke: horses move on the real clock with WebGL', async ({ page }) => {
    const race = new RacePage(page)
    await race.open('?seed=11')
    await trackReady(page)
    await race.generate.click()
    await race.toggle.click()
    await expect.poll(async () => page.getByText(/m to go/).textContent(), { timeout: 5000 }).toMatch(/\d+ m to go/)
    const first = await page.getByText(/m to go/).textContent()
    await page.waitForTimeout(800)
    expect(await page.getByText(/m to go/).textContent()).not.toBe(first)
  })
})

test.describe('3D track', () => {
  /** The pixels WebGL actually drew, read straight from the canvas. */
  const canvasShot = (page: Page) => page.getByTestId('track-canvas').evaluate((c) => (c as HTMLCanvasElement).toDataURL('image/png'))

  test('draws a real WebGL scene, changes while running and stays still while paused', async ({ page }) => {
    // Every frame is drawn by SwiftShader on the CPU, several times slower on CI than locally.
    test.slow()
    await page.clock.install()
    const race = new RacePage(page)
    await race.open('?seed=5')
    await trackReady(page)
    const hasContext = await page.getByTestId('track-canvas').evaluate((c) => !!(c as HTMLCanvasElement).getContext('webgl2'))
    expect(hasContext).toBe(true)

    await race.generate.click()
    await race.toggle.click()
    await page.clock.runFor(1000)
    const t1 = await canvasShot(page)
    await page.clock.runFor(1000)
    const t2 = await canvasShot(page)
    expect(t1).not.toBe(t2)

    await race.toggle.click() // Pause
    const p1 = await canvasShot(page)
    await page.clock.runFor(5000)
    const p2 = await canvasShot(page)
    expect(p1).toBe(p2)
  })

  test('switches between the 3D and the classic 2D track without losing the race', async ({ page }) => {
    await page.clock.install()
    const race = new RacePage(page)
    await race.open('?seed=6')
    await trackReady(page)
    await race.generate.click()
    await race.toggle.click()
    await page.clock.runFor(1000)

    await page.getByTestId('view-switch').getByRole('button', { name: '2D' }).click()
    await expect(race.track).toHaveAttribute('data-mode', 'html')
    const before = await race.laneProgress()
    expect(before.filter((p) => p > 0)).toHaveLength(10)
    await page.clock.runFor(1000)
    const after = await race.laneProgress()
    expect(after.filter((p, i) => p > before[i]!).length).toBeGreaterThanOrEqual(2)

    await page.getByTestId('view-switch').getByRole('button', { name: '3D' }).click()
    await expect(race.track).toHaveAttribute('data-mode', 'webgl')
  })

  test('falls back to the HTML track when WebGL cannot start, and the race still finishes', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type.startsWith('webgl')) return null
        return (original as (...a: unknown[]) => unknown).call(this, type, ...rest)
      } as typeof original
    })
    await page.clock.install()
    const race = new RacePage(page)
    await race.open('?seed=8')
    await race.generate.click()
    await trackReady(page, 'html')
    await race.toggle.click()
    await page.clock.runFor(14_000)
    await expect(race.results.locator('[data-round="1"] [data-place]')).toHaveCount(10)
  })
})

test.describe('navigation', () => {
  test('leaving for the showroom pauses the race; coming back offers Resume', async ({ page }) => {
    await page.clock.install()
    const race = new RacePage(page)
    await race.open('?seed=2&track=html')
    await race.generate.click()
    await race.toggle.click()
    await page.clock.runFor(1000)
    await page.getByRole('link', { name: 'Open the showroom' }).click()
    await expect(page.getByTestId('showroom-title')).toHaveText('Showroom')
    await page.goBack()
    await expect(race.toggle).toHaveText('Resume')
  })

  test('mobile: controls reachable, no sideways scroll @mobile', async ({ page }) => {
    const race = new RacePage(page)
    await race.open('?seed=4')
    await expect(race.generate).toBeInViewport()
    await expect(race.toggle).toBeInViewport()
    await race.generate.click()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
