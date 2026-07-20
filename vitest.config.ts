import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/testing/setup.ts'],
      globals: false,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      restoreMocks: true,
      css: false,

      env: { TZ: 'UTC', VITE_API_MODE: 'msw' },

      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/i18n/locales/**',
          'src/testing/**',
          'src/mocks/**',
          'src/**/*.{test,spec}.{ts,tsx}',
          'src/**/*.d.ts',
          'src/vite-env.d.ts',
          'src/routeTree.gen.ts',
          'src/lib/database.types.ts',
          'src/routes/**',
          'src/main.tsx',
          'src/**/*.stories.tsx',
        ],
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
