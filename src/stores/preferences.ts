import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_PAGE_SIZE } from '~/lib/list-query';
import type { PageSize } from '~/lib/list-query';

export type { PageSize };

type PreferencesStore = {
  pageSize: PageSize;
  setPageSize: (pageSize: PageSize) => void;
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
