/** Query keys for the tags resource. `all` is the invalidation root. */
export const tagKeys = {
  all: ['tags'] as const,
  list: () => [...tagKeys.all, 'list'] as const,
};
