import type { ApplyListConfig } from '~/mocks/lib/apply-list-query';
import type { UserRow } from '~/mocks/fixtures/row-types';

/** The `profiles` row on the wire — the seed row without its seed-only password. */
type ProfileRow = Omit<UserRow, 'password'>;

/**
 * How the MSW applier reproduces the users list. Users are server-side paginated (the
 * profile table grows unbounded), so this mirrors the Supabase list config in
 * `user-api.ts`: search by email (trigram — profiles has no tsvector), sortable by
 * join date, email and name.
 */
export const profileListConfig: ApplyListConfig<ProfileRow> = {
  filterable: {},
  fallbackText: (row) => row.email,
  sortAccessors: {
    created_at: (row) => row.created_at,
    email: (row) => row.email,
    full_name: (row) => row.full_name,
    // The `id` tiebreaker below needs its accessor, or it is silently skipped and the
    // MSW order diverges from Supabase — the seeded profiles all share one created_at,
    // so this tiebreaker decides the whole default order.
    id: (row) => row.id,
  },
  defaultSort: { field: 'created_at', dir: 'desc' },
  tiebreakers: [
    { field: 'created_at', dir: 'desc' },
    { field: 'id', dir: 'desc' },
  ],
};
