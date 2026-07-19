/** Query keys for the teams resource. `all` is the invalidation root. */
export const teamKeys = {
  all: ['teams'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
};
