import { createFileRoute } from '@tanstack/react-router';

import { slaPolicyListQuery } from '~/features/admin/sla-policies/api/sla-policy-queries';
import SlaPolicies from '~/features/admin/sla-policies/pages/sla-policies';

/** `/admin/sla-policies` — CRUD for SLA policies (guarded by the admin layout). The loader
 *  warms the list so the table renders with data, not a loading skeleton. */
export const Route = createFileRoute('/_app/admin/sla-policies')({
  loader: ({ context }) => context.queryClient.ensureQueryData(slaPolicyListQuery()),
  component: SlaPolicies,
});
