import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import {
  CATEGORY_COLUMNS,
  categorySchema,
  type Category,
} from '~/features/admin/categories/schemas/category-schema';

export type CategoryInput = {
  name: string;
  description: string | null;
  default_team_id: string | null;
};

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
