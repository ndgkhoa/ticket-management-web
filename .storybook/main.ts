import type { StorybookConfig } from '@storybook/tanstack-react';

const config: StorybookConfig = {
  // Stories are colocated next to their component, matching the repo's test convention.
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@chromatic-com/storybook', '@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/tanstack-react',
};

export default config;
