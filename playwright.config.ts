import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const baseURL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/fixtures.ts',
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: `bun run build && bunx vite preview --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: { VITE_API_MODE: 'msw', COVERAGE: process.env.COVERAGE ?? '' },
  },
});
