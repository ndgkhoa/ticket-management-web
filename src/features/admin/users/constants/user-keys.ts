export const userKeys = {
  all: ['users'] as const,
  list: (params?: unknown) => [...userKeys.all, 'list', params] as const,
  roles: (id: string) => [...userKeys.all, 'roles', id] as const,
};
