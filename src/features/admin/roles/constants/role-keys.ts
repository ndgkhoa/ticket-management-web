/**
 * Query-key factory for roles. Client-side list (roles are bounded to a handful of
 * rows), so it takes no params. `as const` keeps the tuples comparable and lets
 * `invalidateQueries({ queryKey: roleKeys.all })` match everything beneath it.
 */
export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
  /** The permission-id set granted to a role (the matrix editor). */
  permissions: (id: string) => [...roleKeys.all, 'permissions', id] as const,
};
