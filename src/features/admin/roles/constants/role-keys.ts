export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
  permissions: (id: string) => [...roleKeys.all, 'permissions', id] as const,
};
