import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

import { assertTestDatabase } from './e2e/guard'

/**
 * End-to-end tests of the booking page (e2e/). Run with `npm run test:e2e`.
 *
 * - Chromium only. `mobile` (Pixel 7) runs everything; `desktop` runs the main flow only
 *   (tests tagged @desktop), in a New York time zone to prove times stay on the Beirut clock.
 * - One worker, one test at a time: every test shares the same database and calendar.
 * - Uses the dev server on :3000 when it is already running, otherwise starts `npm run dev`.
 * - Every record the tests create is deleted in the global teardown, even after failures
 *   (and by `npm run test:e2e:clean`).
 */
dotenv.config()
assertTestDatabase()

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/artifacts',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // The dev server compiles pages on first visit; server actions talk to a remote database.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 90_000,
    actionTimeout: 20_000,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    {
      name: 'desktop',
      grep: /@desktop/,
      use: { ...devices['Desktop Chrome'], timezoneId: 'America/New_York' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: `${baseURL}/en`,
    reuseExistingServer: true,
    timeout: 240_000,
  },
})
