export const cannedResponseKeys = {
  all: ['canned_responses'] as const,
  list: (params?: unknown) => [...cannedResponseKeys.all, 'list', params] as const,
};
