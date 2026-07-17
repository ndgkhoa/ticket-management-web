import { createFileRoute } from '@tanstack/react-router';

import SlaPolicies from '~/features/admin/sla-policies/pages/sla-policies';

/** `/admin/sla-policies` — CRUD for SLA policies (guarded by the admin layout). */
export const Route = createFileRoute('/_app/admin/sla-policies')({
  component: SlaPolicies,
});
