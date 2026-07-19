import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { TAG_COLUMNS, tagSchema, type Tag } from '~/features/admin/tags/schemas/tag-schema';

/** What the create/edit form submits — the writable columns, nothing generated. */
export type TagInput = { name: string; color: string };

/**
 * Data access for tags: a bounded lookup table, so the list is a plain fetch-all
 * ordered read (client-side paged in the table). Writes go straight through the SDK
 * and re-validate the returned row into the domain model.
 */
export const tagApi = {
  list: async (): Promise<Tag[]> => {
    const { data } = await supabase.from('tags').select(TAG_COLUMNS).order('name').throwOnError();
    return z.array(tagSchema).parse(data);
  },

  create: async (input: TagInput): Promise<Tag> => {
    const { data } = await supabase
      .from('tags')
      .insert(input)
      .select(TAG_COLUMNS)
      .single()
      .throwOnError();
    return tagSchema.parse(data);
  },

  update: async (id: string, input: TagInput): Promise<Tag> => {
    const { data } = await supabase
      .from('tags')
      .update(input)
      .eq('id', id)
      .select(TAG_COLUMNS)
      .single()
      .throwOnError();
    return tagSchema.parse(data);
  },

  remove: async (id: string): Promise<void> => {
    await supabase.from('tags').delete().eq('id', id).throwOnError();
  },
};
