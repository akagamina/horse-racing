import { defineConfig, devices } from '@playwright/test'

/**
 * Tests run against the production build served under a GitHub Pages-style
 * sub-path, so asset URLs and hash routes are checked the way they ship.
 * Build first: `npm run build` (CI does this once and tests that same output).
 */
const PORT = 4173
const BASE = '/horse-racing/'

// Software WebGL (SwiftShader) so the 3D track renders identically on CI and locally.
const webglArgs = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: 'retain-on-failure',
    launchOptions: { args: webglArgs },
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: 'disabled', caret: 'hide' },
  },
  webServer: {
    command: `node scripts/serve-subpath.mjs --port ${PORT} --base ${BASE}`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'e2e', testDir: 'tests/e2e', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'e2e-mobile',
      testDir: 'tests/e2e',
      grep: /@mobile/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 },
    },
    { name: 'visual', testDir: 'tests/visual', use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 } },
  ],
})
