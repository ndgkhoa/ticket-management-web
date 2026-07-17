import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_PAGE_SIZE } from '~/lib/list-query';
import type { PageSize } from '~/lib/list-query';

/**
 * Persisted client preferences. Currently just the list page size — the default a
 * list uses when the URL doesn't specify one, so a user who picks 50 rows doesn't
 * re-pick it every visit.
 *
 * Theme lives in the ThemeProvider (shadcn's documented path), not here — so this
 * store owns everything that isn't theme, and the two localStorage keys stay to their
 * own concerns rather than one store mirroring the other.
 *
 * `pageSize` is union-typed, not `number`: the deleted preferences store typed its
 * fields loosely and `set('nonsense')` compiled.
 */
export type { PageSize };

type PreferencesStore = {
  pageSize: PageSize;
  setPageSize: (pageSize: PageSize) => void;
  /** Whether the app sidebar is collapsed to an icon rail. Persisted across visits. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      pageSize: DEFAULT_PAGE_SIZE,
      setPageSize: (pageSize) => set({ pageSize }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: 'preferences-storage' }
  )
);
