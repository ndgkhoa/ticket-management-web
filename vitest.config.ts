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
      /**
       * `VITE_API_MODE: 'msw'` because the whole suite answers from MSW, never a real
       * backend. It also discharges `env.ts`'s refinement: the default mode is
       * `supabase`, which demands `VITE_SUPABASE_*`, and CI has neither those vars nor
       * a `.env.local` — so any test that transitively imports `env.ts` (anything that
       * renders the app) would throw at import. Pinning the mode here is what keeps the
       * suite green on a runner with no environment file, matching how e2e already sets
       * it for the preview server.
       */
      env: { TZ: 'UTC', VITE_API_MODE: 'msw' },

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
          // Generated code — the router tree (from src/routes/) and the Supabase types.
          // Testing generated output tests the generator, not this codebase.
          'src/routeTree.gen.ts',
          'src/lib/database.types.ts',
          // Declarative route modules: `createFileRoute({ loader, component })` glue with no
          // branching of its own. The logic they wire lives in features/ (unit-tested) and the
          // routes themselves are exercised end-to-end by Playwright, which v8 can't see.
          'src/routes/**',
          // App bootstrap + Storybook stories — not unit-test targets.
          'src/main.tsx',
          'src/**/*.stories.tsx',
        ],
        /**
         * A floor with headroom — it catches a collapse, not a dip.
         *
         * This measures Vitest unit/integration coverage only (~40%). It reads low by design,
         * not by neglect: this is a UI-heavy app whose components and full user flows are covered
         * by Playwright in a real browser (`e2e/`), which V8 here can't see — unit tests target
         * the logic (schemas, list-query, SLA/audit mirrors, stores, guards, api). Generated code
         * (router tree, DB types) and declarative route glue are excluded above. Raising this
         * floor toward the e2e-covered surface would mean writing unit tests that duplicate the
         * e2e suite, so the gate stays a collapse-detector, set just under the current numbers.
         */
        thresholds: {
          statements: 35,
          branches: 25,
          functions: 30,
          lines: 35,
        },
      },
    },
  })
);
