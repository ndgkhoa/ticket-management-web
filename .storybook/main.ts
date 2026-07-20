import type { StorybookConfig } from '@storybook/tanstack-react';

process.env.VITE_API_MODE ??= 'msw';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@chromatic-com/storybook', '@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/tanstack-react',
};

export default config;
