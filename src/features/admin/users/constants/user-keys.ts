/**
 * Query-key factory for users.
 *
 * `list(params)` takes params because the users list is server-side paginated (the
 * profile table grows unbounded, unlike roles/permissions) — each page/filter combo
 * is its own cache entry, which is what makes `keepPreviousData` hold the previous
 * page while the next loads.
 */
export const userKeys = {
  all: ['users'] as const,
  list: (params?: unknown) => [...userKeys.all, 'list', params] as const,
  /** The role ids one user holds, per the `user_roles` junction. */
  roles: (id: string) => [...userKeys.all, 'roles', id] as const,
};
