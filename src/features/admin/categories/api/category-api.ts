import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import {
  CATEGORY_COLUMNS,
  categorySchema,
  type Category,
} from '~/features/admin/categories/schemas/category-schema';

/** What the create/edit form submits — the writable columns, nothing generated. */
export type CategoryInput = {
  name: string;
  description: string | null;
  /** Team a ticket in this category is auto-routed to on create (null = no routing). */
  default_team_id: string | null;
};

/**
 * Data access for categories: a bounded lookup table, so the list is a plain
 * fetch-all ordered read (client-side paged in the table). Writes go straight through
 * the SDK and re-validate the returned row into the domain model.
 */
export const categoryApi = {
  list: async (): Promise<Category[]> => {
    const { data } = await supabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .order('name')
      .throwOnError();
    return z.array(categorySchema).parse(data);
  },

  create: async (input: CategoryInput): Promise<Category> => {
    const { data } = await supabase
      .from('categories')
      .insert(input)
      .select(CATEGORY_COLUMNS)
      .single()
      .throwOnError();
    return categorySchema.parse(data);
  },

  update: async (id: string, input: CategoryInput): Promise<Category> => {
    const { data } = await supabase
      .from('categories')
      .update(input)
      .eq('id', id)
      .select(CATEGORY_COLUMNS)
      .single()
      .throwOnError();
    return categorySchema.parse(data);
  },

  remove: async (id: string): Promise<void> => {
    await supabase.from('categories').delete().eq('id', id).throwOnError();
  },
};
