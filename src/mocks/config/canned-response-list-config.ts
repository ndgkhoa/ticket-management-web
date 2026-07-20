import type { ApplyListConfig } from '~/mocks/lib/apply-list-query';
import type { CannedResponseRow } from '~/mocks/fixtures/row-types';

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
