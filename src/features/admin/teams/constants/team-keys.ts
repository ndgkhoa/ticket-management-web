export const teamKeys = {
  all: ['teams'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
};
