/**
 * monocart-coverage-reports config for the Playwright e2e suite.
 *
 * Collects V8 JS coverage from the browser, maps it back through the build's source maps to
 * `src/`, and writes an lcov report that CI uploads to Codecov under the `e2e` flag. Together
 * with the vitest `unit` flag, the badge then reflects real total coverage — the app is heavily
 * exercised by e2e, which V8 unit coverage alone can't see.
 *
 * CommonJS (`.cjs`) on purpose: package.json is `type: module`, so a plain `.js` config would be
 * parsed as ESM and `module.exports` would throw.
 */
module.exports = {
  name: 'E2E Coverage',
  outputDir: './coverage-e2e',
  // `lcovonly` → coverage-e2e/lcov.info, the one file Codecov needs.
  reports: [['lcovonly'], ['console-summary']],
  // V8 entries: keep only the bundled JS chunks (they carry source maps → unpack to src/), and
  // drop the HTML documents' inline scripts, which have no map and would show as phantom files.
  entryFilter: (entry) => entry.url.includes('/assets/') && entry.url.endsWith('.js'),
  // After source maps are unpacked, keep only our own source — not node_modules or generated code.
  sourceFilter: (sourcePath) =>
    sourcePath.includes('src/') &&
    !sourcePath.includes('node_modules') &&
    !sourcePath.includes('routeTree.gen') &&
    !sourcePath.includes('database.types'),
};
