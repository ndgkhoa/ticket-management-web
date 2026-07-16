/**
 * Query-key factory for roles. Client-side list (roles are bounded to a handful of
 * rows), so it takes no params. `as const` keeps the tuples comparable and lets
 * `invalidateQueries({ queryKey: roleKeys.all })` match everything beneath it.
 */
export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
  detail: (id: string) => [...roleKeys.all, 'detail', id] as const,
};
