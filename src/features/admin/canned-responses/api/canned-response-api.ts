import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { useAuthStore } from '~/stores/auth';
import { runListQuery, type ListQueryConfig } from '~/lib/list-query-builder';
import type { ListParams } from '~/lib/list-query';
import {
  CANNED_RESPONSE_COLUMNS,
  cannedResponseSchema,
} from '~/features/admin/canned-responses/schemas/canned-response-schema';

export type CannedResponseInput = { title: string; body: string };

const cannedResponseListConfig: ListQueryConfig = {
  fallbackColumn: 'title',
  sortableFields: ['created_at', 'title'],
  defaultSort: { field: 'created_at', dir: 'desc' },
  tiebreakers: [
    { field: 'created_at', dir: 'desc' },
    { field: 'id', dir: 'desc' },
  ],
};

export const cannedResponseApi = {
  list: async (params: ListParams) => {
    const { rows, totalCount, pageCount } = await runListQuery(
      () =>
        supabase.from('canned_responses').select(CANNED_RESPONSE_COLUMNS, { count: 'estimated' }),
      params,
      cannedResponseListConfig
    );

    return { rows: z.array(cannedResponseSchema).parse(rows), totalCount, pageCount };
  },

  create: async (input: CannedResponseInput) => {
    const { data } = await supabase
      .from('canned_responses')
      .insert({
        ...input,
        created_at: new Date().toISOString(),
        created_by: useAuthStore.getState().user?.id ?? null,
      })
      .select(CANNED_RESPONSE_COLUMNS)
      .single()
      .throwOnError();
    return cannedResponseSchema.parse(data);
  },

  update: async (id: string, input: CannedResponseInput) => {
    const { data } = await supabase
      .from('canned_responses')
      .update(input)
      .eq('id', id)
      .select(CANNED_RESPONSE_COLUMNS)
      .single()
      .throwOnError();
    return cannedResponseSchema.parse(data);
  },

  remove: async (id: string): Promise<void> => {
    await supabase.from('canned_responses').delete().eq('id', id).throwOnError();
  },
};
