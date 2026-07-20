import type { StorybookConfig } from '@storybook/tanstack-react';

// Storybook renders components in isolation and never boots the app, so it must not depend on the
// app's runtime env. Default to `msw` mode: it satisfies the Zod schema in `~/config/env` (which
// otherwise demands VITE_SUPABASE_* in the default `supabase` mode), so a story bundle that
// transitively imports env still builds and renders without a `.env` — in CI (Chromatic) and
// locally. Vite exposes VITE_-prefixed process env, so this reaches `import.meta.env`.
process.env.VITE_API_MODE ??= 'msw';

const config: StorybookConfig = {
  // Stories are colocated next to their component, matching the repo's test convention.
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@chromatic-com/storybook', '@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/tanstack-react',
};

export default config;
