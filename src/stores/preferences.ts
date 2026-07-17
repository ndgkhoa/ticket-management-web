import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_PAGE_SIZE } from '~/lib/list-query';
import type { PageSize } from '~/lib/list-query';

/**
 * Persisted client preferences: the two pieces of UI state that should outlive a
 * visit.
 *
 * Kept in Zustand, not a React ThemeProvider, so the app has ONE client-state
 * mechanism (the auth store is the other) — `code-standards`' "client state = Zustand
 * only". A ThemeProvider would add a second one and its own localStorage key; this
 * store owns both prefs under a single key, avoiding the split-storage bug class that
 * bit the old code twice.
 *
 * Both are union-typed, not `string`/`number`: the deleted store typed `theme: string`
 * and `setTheme('nonsense')` compiled.
 */
export type ThemeChoice = 'light' | 'dark' | 'system';
export type { PageSize };

type PreferencesStore = {
  /** The user's explicit choice; `system` follows the OS via matchMedia. */
  theme: ThemeChoice;
  /** Default page size for lists when the URL doesn't specify one. */
  pageSize: PageSize;
  setTheme: (theme: ThemeChoice) => void;
  setPageSize: (pageSize: PageSize) => void;
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      theme: 'system',
      pageSize: DEFAULT_PAGE_SIZE,
      setTheme: (theme) => set({ theme }),
      setPageSize: (pageSize) => set({ pageSize }),
    }),
    {
      // One key. The FOUC script in index.html reads this exact key before React
      // mounts, so the stored value drives the initial paint — no second copy.
      name: 'preferences-storage',
    }
  )
);
