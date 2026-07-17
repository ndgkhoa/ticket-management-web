import { usePreferencesStore, type ThemeChoice } from '~/stores/preferences';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Resolve a choice to a concrete theme, reading the OS preference for `system`. */
export function resolveTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice === 'system') {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  }
  return choice;
}

/** Toggle the `.dark` class on <html> to match the resolved theme. */
export function applyTheme(choice: ThemeChoice): void {
  document.documentElement.classList.toggle('dark', resolveTheme(choice) === 'dark');
}

/**
 * Wire the preference store and the OS setting to the document class. Called once at
 * app start; returns an unsubscribe for cleanup.
 *
 * Three inputs drive the class: the initial stored value (applied immediately — the
 * FOUC script in index.html already set it before React, this keeps React in step),
 * every subsequent store change, and OS changes while the choice is `system`.
 */
export function subscribeToTheme(): () => void {
  applyTheme(usePreferencesStore.getState().theme);

  const unsubscribeStore = usePreferencesStore.subscribe((state) => applyTheme(state.theme));

  const media = window.matchMedia(DARK_QUERY);
  const onMediaChange = () => {
    if (usePreferencesStore.getState().theme === 'system') applyTheme('system');
  };
  media.addEventListener('change', onMediaChange);

  return () => {
    unsubscribeStore();
    media.removeEventListener('change', onMediaChange);
  };
}
