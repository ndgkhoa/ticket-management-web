/** Query keys for the SLA policies resource. `all` is the invalidation root. */
export const slaPolicyKeys = {
  all: ['sla_policies'] as const,
  list: () => [...slaPolicyKeys.all, 'list'] as const,
};
