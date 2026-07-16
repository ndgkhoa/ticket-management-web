/**
 * Query-key factory for permissions.
 *
 * `as const` so the keys are readonly tuples TanStack Query compares structurally,
 * and so `invalidateQueries({ queryKey: permissionKeys.all })` matches every derived
 * key beneath it. The list is client-side (the permission catalogue is bounded to
 * tens of rows), so it takes no params — there is one list, not one per page.
 */
export const permissionKeys = {
  all: ['permissions'] as const,
  list: () => [...permissionKeys.all, 'list'] as const,
  detail: (id: string) => [...permissionKeys.all, 'detail', id] as const,
};
