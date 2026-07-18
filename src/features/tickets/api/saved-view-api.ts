import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { useAuthStore } from '~/stores/auth';
import type { Json } from '~/lib/database.types';
import {
  SAVED_VIEW_COLUMNS,
  savedViewSchema,
  type SavedView,
} from '~/features/tickets/schemas/saved-view-schema';
import type { TicketSearch } from '~/features/tickets/schemas/ticket-search-schema';

/** What the save dialog submits. */
export type SavedViewInput = {
  name: string;
  search: TicketSearch;
  isShared: boolean;
};

/**
 * Data access for saved views: a per-user, mostly-small set, so the list is a plain
 * fetch-all (RLS returns the caller's own views plus every shared one). Writes carry the
 * owner id explicitly — it matches `auth.uid()`, which the insert policy re-checks, and
 * the mock has no session default to fill it.
 */
export const savedViewApi = {
  list: async (): Promise<SavedView[]> => {
    const { data } = await supabase
      .from('saved_views')
      .select(SAVED_VIEW_COLUMNS)
      .order('created_at', { ascending: true })
      .throwOnError();
    return z.array(savedViewSchema).parse(data);
  },

  create: async (input: SavedViewInput): Promise<SavedView> => {
    const { data } = await supabase
      .from('saved_views')
      .insert({
        user_id: useAuthStore.getState().user?.id,
        name: input.name,
        // The URL search object is stored verbatim as jsonb.
        search: input.search as unknown as Json,
        is_shared: input.isShared,
        // The mock insert fills only `id`; supply `created_at` so the returned row
        // round-trips the schema against MSW as it does against the live default.
        created_at: new Date().toISOString(),
      })
      .select(SAVED_VIEW_COLUMNS)
      .single()
      .throwOnError();
    return savedViewSchema.parse(data);
  },

  /** Toggle sharing — owner-only, enforced by RLS. */
  setShared: async (id: string, isShared: boolean): Promise<SavedView> => {
    const { data } = await supabase
      .from('saved_views')
      .update({ is_shared: isShared })
      .eq('id', id)
      .select(SAVED_VIEW_COLUMNS)
      .single()
      .throwOnError();
    return savedViewSchema.parse(data);
  },

  remove: async (id: string): Promise<void> => {
    await supabase.from('saved_views').delete().eq('id', id).throwOnError();
  },
};
