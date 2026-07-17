import type { Preview, Decorator } from '@storybook/tanstack-react';

// The app's Tailwind theme (tokens + `.dark` block) and i18next, so components render
// styled and translated exactly as in the app. i18next is a module singleton — importing
// it here runs `.init()` once before any story mounts.
import '../src/styles/index.css';
import '../src/i18n';

/**
 * Toggle the `.dark` class on <html> from the toolbar. Mirrors what the app's
 * ThemeProvider does at runtime, so every story can be viewed in both themes without
 * pulling the provider's state machine into Storybook.
 */
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? 'light';
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  return (
    <div className="bg-background text-foreground p-6">
      <Story />
    </div>
  );
};

const preview: Preview = {
  // Every component gets an auto-generated Docs page (props from types + the meta
  // descriptions below), so the catalog documents itself.
  tags: ['autodocs'],
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Light / dark theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: 'todo' },
  },
};

export default preview;
