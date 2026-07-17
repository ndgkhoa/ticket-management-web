/**
 * Query-key factory for users.
 *
 * `list(params)` takes params because the users list is server-side paginated (the
 * profile table grows unbounded, unlike roles/permissions) — each page/filter combo
 * is its own cache entry, which is what makes `keepPreviousData` hold the previous
 * page while the next loads. This stage renders a read-only slice; the paginated UI
 * that supplies real params arrives with the rebuild.
 */
export const userKeys = {
  all: ['users'] as const,
  list: (params?: unknown) => [...userKeys.all, 'list', params] as const,
};
