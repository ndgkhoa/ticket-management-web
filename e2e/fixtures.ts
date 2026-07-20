import { test as base, expect } from '@playwright/test';
import { CoverageReport } from 'monocart-coverage-reports';

/**
 * The e2e `test`, extended with automatic V8 coverage collection.
 *
 * When `COVERAGE=true`, an auto-fixture starts JS coverage before each test and hands the raw
 * V8 data to monocart-coverage-reports after it, which caches it for `coverage-teardown.ts` to
 * merge and map back to `src/`. When the flag is off (normal / local runs) the fixture is a
 * no-op, so it adds nothing to everyday e2e time. Chromium-only — `page.coverage` is a CDP API.
 *
 * Every spec imports `test`/`expect` from here instead of `@playwright/test` so the fixture
 * applies without a per-file opt-in.
 */
const collectCoverage = process.env.COVERAGE === 'true';

export const test = base.extend<{ autoCoverage: void }>({
  autoCoverage: [
    async ({ page }, use) => {
      if (collectCoverage) {
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
      }

      await use();

      if (collectCoverage) {
        const coverage = await page.coverage.stopJSCoverage();
        // Each worker adds its raw V8 data to the shared cache (from mcr.config.cjs's outputDir);
        // coverage-teardown.ts merges the cache into lcov once all tests finish.
        const report = new CoverageReport();
        await report.loadConfig();
        await report.add(coverage);
      }
    },
    { auto: true },
  ],
});

export { expect };
export type { Page } from '@playwright/test';

/**
 * Playwright `globalTeardown` (wired in `playwright.config.ts`). After every test has cached its
 * V8 coverage above, merge the cache into one lcov report mapped back to `src/`. Co-located with
 * the fixture so all e2e coverage wiring lives in one file. No-op unless `COVERAGE=true`; config
 * comes from `mcr.config.cjs`.
 */
export default async function mergeCoverage() {
  if (!collectCoverage) return;

  const report = new CoverageReport();
  await report.loadConfig();
  await report.generate();
}
