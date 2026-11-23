import { expect, test } from '@playwright/test'
import { SHOWROOM, entryPath } from '../../src/showroom/manifest'

test('index links to every page in the manifest and each one opens', async ({ page }) => {
  await page.goto('./#/showroom')
  for (const entry of SHOWROOM) {
    await expect(page.getByTestId(`showroom-link-${entry.kind}-${entry.slug}`)).toHaveAttribute('href', `#${entryPath(entry)}`)
  }
  await page.getByTestId('showroom-link-states-after-round-1').click()
  await expect(page.getByTestId('showroom-title')).toHaveText('After round 1')
  await expect(page.getByTestId('results').locator('[data-round]')).toHaveCount(1)
  await page.getByTestId('back-to-showroom').click()
  await expect(page.getByTestId('showroom-title')).toHaveText('Showroom')
})

for (const entry of SHOWROOM) {
  test(`direct URL + refresh: ${entry.kind}/${entry.slug}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`./#${entryPath(entry)}`)
    await expect(page.getByTestId('showroom-title')).toHaveText(entry.title)
    await page.reload()
    await expect(page.getByTestId('showroom-title')).toHaveText(entry.title)
    await expect(page.getByTestId('showroom-hint')).toHaveText(entry.hint)
    expect(errors).toEqual([])
  })
}

test('completed state shows six groups and sixty rows', async ({ page }) => {
  await page.goto('./#/showroom/states/completed')
  await expect(page.getByTestId('results').locator('[data-round]')).toHaveCount(6)
  await expect(page.getByTestId('results').locator('[data-place]')).toHaveCount(60)
})

test('unknown showroom slug offers a way back', async ({ page }) => {
  await page.goto('./#/showroom/horses/not-a-horse')
  await expect(page.getByTestId('showroom-missing')).toBeVisible()
  await page.getByRole('link', { name: 'showroom index' }).click()
  await expect(page.getByTestId('showroom-title')).toHaveText('Showroom')
})

test('showroom interaction stays local: the game is untouched', async ({ page }) => {
  await page.goto('./?seed=1#/showroom/states/ready')
  await page.getByTestId('toggle').click()
  await page.goto('./?seed=1#/')
  await expect(page.getByTestId('toggle')).toBeDisabled()
  await expect(page.getByTestId('results-empty')).toBeVisible()
})
