import type { ApplyListConfig } from '~/mocks/lib/apply-list-query';
import type { UserRow } from '~/mocks/fixtures/row-types';

type ProfileRow = Omit<UserRow, 'password'>;

export const profileListConfig: ApplyListConfig<ProfileRow> = {
  filterable: {},
  fallbackText: (row) => row.email,
  sortAccessors: {
    created_at: (row) => row.created_at,
    email: (row) => row.email,
    full_name: (row) => row.full_name,
    id: (row) => row.id,
  },
  defaultSort: { field: 'created_at', dir: 'desc' },
  tiebreakers: [
    { field: 'created_at', dir: 'desc' },
    { field: 'id', dir: 'desc' },
  ],
};
