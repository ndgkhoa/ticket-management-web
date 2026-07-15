export const userKeys = {
  all: ['user'],
  lists: () => [...userKeys.all, 'list'],
  list: (params?: unknown) => [...userKeys.lists(), params],
  details: () => [...userKeys.all, 'details'],
  detail: (id?: string) => [...userKeys.details(), id],
  create: () => [...userKeys.all, 'create'],
  update: () => [...userKeys.all, 'update'],
  delete: () => [...userKeys.all, 'delete'],
};
