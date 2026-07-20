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

export type SavedViewInput = {
  name: string;
  search: TicketSearch;
  isShared: boolean;
};

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
        search: input.search as unknown as Json,
        is_shared: input.isShared,
        created_at: new Date().toISOString(),
      })
      .select(SAVED_VIEW_COLUMNS)
      .single()
      .throwOnError();
    return savedViewSchema.parse(data);
  },

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
