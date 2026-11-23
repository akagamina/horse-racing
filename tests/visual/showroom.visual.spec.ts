import { expect, test, type Page } from '@playwright/test'
import { FIXTURE_HORSES } from '../../src/showroom/manifest'

/** Every showroom page is built from a fixed seed; we wait for the 3D canvases before shooting. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  const tracks = page.locator('[data-testid="race-track"]')
  for (let i = 0; i < (await tracks.count()); i++) await expect(tracks.nth(i)).toHaveAttribute('data-mode', /webgl|html/)
  const horses = page.locator('[data-testid="horse-canvas"]')
  for (let i = 0; i < (await horses.count()); i++) await expect(horses.nth(i)).toHaveAttribute('data-ready', 'true')
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}

const desktop = { width: 1440, height: 900 }
const mobile = { width: 390, height: 844 }

const boardPages = [
  'screens/race-board',
  'states/idle',
  'states/ready',
  'states/running',
  'states/paused',
  'states/after-round-1',
  'states/completed',
]

test.describe('desktop 1440 × 900', () => {
  test.use({ viewport: desktop })
  for (const path of boardPages) {
    test(path, async ({ page }) => {
      await page.goto(`./#/showroom/${path}`)
      await settle(page)
      await expect(page).toHaveScreenshot(`${path.replace('/', '-')}.png`)
    })
  }

  for (const slug of ['galloping-horse', 'silks-lineup', 'html-track']) {
    test(`visual: ${slug}`, async ({ page }) => {
      await page.goto(`./#/showroom/visuals/${slug}`)
      await settle(page)
      await expect(page).toHaveScreenshot(`visual-${slug}.png`, { fullPage: true })
    })
  }

  test('horse detail page', async ({ page }) => {
    await page.goto(`./#/showroom/horses/${FIXTURE_HORSES[0]!.id}`)
    await settle(page)
    await expect(page).toHaveScreenshot('horse-detail.png')
  })
})

test.describe('mobile 390 × 844', () => {
  test.use({ viewport: mobile, isMobile: true, hasTouch: true })
  test('race board', async ({ page }) => {
    await page.goto('./#/showroom/screens/race-board')
    await settle(page)
    await expect(page).toHaveScreenshot('mobile-race-board.png')
  })
  test('completed, results filled', async ({ page }) => {
    await page.goto('./#/showroom/states/completed')
    await settle(page)
    await page.getByTestId('results').scrollIntoViewIfNeeded()
    await expect(page).toHaveScreenshot('mobile-completed-results.png')
  })
})
