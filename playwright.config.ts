import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const baseURL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  // Every assertion in e2e waits on a real browser; the default 5s is generous
  // locally and tight on a cold CI runner.
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // A `.only` left in a file silently shrinks the suite to one test while CI stays
  // green. Fail the run instead.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL,
    // Artefacts only for failures: they are what makes a red CI run diagnosable
    // without reproducing it locally, and worthless noise otherwise.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  /**
   * e2e runs against the production build, not the dev server.
   *
   * Vite 8 uses Rolldown for `build` and a different pipeline for `dev`, so a
   * bundler-only breakage is invisible to a dev-server test — exactly the failure
   * the build swap can produce.
   *
   * VITE_API_MODE=msw so the suite exercises the same boot path as the demo build —
   * worker registration included. It does not yet mock any data: the handler registry
   * is empty until the data contract exists, and unhandled requests are warned about
   * and passed through. The pages tested here fetch nothing, so that is sufficient
   * today and honest about why.
   */
  webServer: {
    // --strictPort so preview fails loudly if the port is taken. Without it Vite picks
    // the next free port, the suite keeps pointing at `baseURL`, and whatever already
    // owns 4173 gets tested instead — green results for the wrong app.
    command: `bun run build && bunx vite preview --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: { VITE_API_MODE: 'msw' },
  },
});
