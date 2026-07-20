import { createFileRoute } from '@tanstack/react-router';

import { slaPolicyListQuery } from '~/features/admin/sla-policies/api/sla-policy-queries';
import SlaPolicies from '~/features/admin/sla-policies/pages/sla-policies';

export const Route = createFileRoute('/_app/admin/sla-policies')({
  loader: ({ context }) => context.queryClient.ensureQueryData(slaPolicyListQuery()),
  component: SlaPolicies,
});
