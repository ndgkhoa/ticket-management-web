import { test as base, expect } from '@playwright/test';
import { CoverageReport } from 'monocart-coverage-reports';

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

export default async function mergeCoverage() {
  if (!collectCoverage) return;

  const report = new CoverageReport();
  await report.loadConfig();
  await report.generate();
}
