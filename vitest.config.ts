import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

/**
 * Tests run through the app's real Vite config.
 *
 * `mergeConfig` rather than a standalone config: the `~` alias, the React plugin
 * and the Tailwind plugin are declared once in vite.config.ts. A second copy here
 * would drift, and the failure mode — tests resolving imports differently from the
 * app — is the kind that makes a green suite meaningless.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/testing/setup.ts'],
      // Explicit imports over `globals: true`: it keeps ESLint honest about
      // undefined names and makes each test file say where `expect` comes from.
      globals: false,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      // Playwright owns e2e/ and has its own runner; Vitest must not try to run it.
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      restoreMocks: true,
      css: false,

      /**
       * Pin the timezone so the suite is deterministic on every machine.
       *
       * `formatDate` renders an instant in the viewer's zone — correct for a help
       * desk, where an agent should see the ticket's time in their own day. But that
       * makes any assertion on a fixed output timezone-dependent: without this,
       * `formatDate('2024-01-05T00:00:00Z')` is '05/01/2024' here and '04/01/2024' in
       * New York, so the suite passed in UTC+7 and CI (UTC) while failing for a
       * contributor west of Greenwich. The formatter is right; the test needed a
       * fixed zone to assert against.
       */
      env: { TZ: 'UTC' },

      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          // Generated from scripts/data/*.yaml — testing it would test js-yaml.
          'src/i18n/locales/**',
          // Test infrastructure and mocks are exercised *by* tests, not targets of them.
          'src/testing/**',
          'src/mocks/**',
          'src/**/*.{test,spec}.{ts,tsx}',
          // Type-only files emit no runtime code to cover.
          'src/**/*.d.ts',
          'src/vite-env.d.ts',
        ],
        /**
         * A floor with deliberate headroom — it catches a collapse, not a dip.
         *
         * The suite currently measures ~8.45 / 5.53 / 5.37 / 8.51. Setting the floor at
         * those numbers was the obvious move and the wrong one: coverage is a ratio, so
         * *adding untested code lowers it even when no test was lost*. Measured: one new
         * 60-function file with no tests takes statements to 7.08% and turns CI red
         * while nothing regressed. Every phase from here adds new code, so a tight floor
         * would have meant a permanently red gate — the kind people learn to ignore.
         *
         * These numbers are low, and honest about why: coverage counts all of `src/`,
         * most of which is antd screens due to be replaced wholesale, and testing those
         * would mean writing tests to delete. This gate only catches the tests
         * disappearing. Raise it — deliberately — as each phase lands code meant to stay.
         */
        thresholds: {
          statements: 5,
          branches: 4,
          functions: 4,
          lines: 5,
        },
      },
    },
  })
);
