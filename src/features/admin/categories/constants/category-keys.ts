/** Query keys for the categories resource. `all` is the invalidation root. */
export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
};
