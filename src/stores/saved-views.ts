import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { TicketSearch } from '~/features/tickets/schemas/ticket-search-schema';

/**
 * Saved ticket-list views — named snapshots of the URL search-param object, persisted
 * per browser.
 *
 * A view stores the whole `TicketSearch`, and applying one navigates to the equivalent
 * URL, so a saved view and a shared link are the same thing: whatever a link would
 * restore, a view restores identically (filters, search, sort, page size). Client-only
 * (Zustand + localStorage) — a personal shortcut, not shared server state, so it needs
 * no table and works the same in `msw` and live mode.
 */
export type SavedView = {
  id: string;
  name: string;
  search: TicketSearch;
};

type SavedViewsStore = {
  views: SavedView[];
  addView: (name: string, search: TicketSearch) => void;
  removeView: (id: string) => void;
};

export const useSavedViewsStore = create<SavedViewsStore>()(
  persist(
    (set) => ({
      views: [],
      addView: (name, search) =>
        set((state) => ({
          views: [...state.views, { id: crypto.randomUUID(), name: name.trim(), search }],
        })),
      removeView: (id) => set((state) => ({ views: state.views.filter((view) => view.id !== id) })),
    }),
    { name: 'ticket-saved-views' }
  )
);
