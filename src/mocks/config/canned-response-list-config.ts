import type { ApplyListConfig } from '~/mocks/lib/apply-list-query';
import type { CannedResponseRow } from '~/mocks/fixtures/row-types';

/**
 * How the MSW applier reproduces the canned-responses list. Server-side paginated (the
 * library grows unbounded), so this mirrors the Supabase list config in `canned-api.ts`:
 * search by title (trigram — no tsvector), sortable by title and creation date.
 */
export const cannedResponseListConfig: ApplyListConfig<CannedResponseRow> = {
  filterable: {},
  fallbackText: (row) => row.title,
  sortAccessors: {
    created_at: (row) => row.created_at,
    title: (row) => row.title,
    id: (row) => row.id,
  },
  defaultSort: { field: 'created_at', dir: 'desc' },
  tiebreakers: [
    { field: 'created_at', dir: 'desc' },
    { field: 'id', dir: 'desc' },
  ],
};
