export const slaPolicyKeys = {
  all: ['sla_policies'] as const,
  list: () => [...slaPolicyKeys.all, 'list'] as const,
};
