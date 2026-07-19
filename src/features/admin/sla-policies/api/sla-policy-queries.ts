import { createCrudQueries } from '~/features/admin/shared/use-crud-queries';
import {
  slaPolicyApi,
  type SlaPolicyInput,
} from '~/features/admin/sla-policies/api/sla-policy-api';
import { slaPolicyKeys } from '~/features/admin/sla-policies/constants/sla-policy-keys';
import type { SlaPolicy } from '~/features/admin/sla-policies/schemas/sla-policy-schema';

export const {
  listQuery: slaPolicyListQuery,
  useList: useSlaPolicyList,
  useCreate: useSlaPolicyCreate,
  useUpdate: useSlaPolicyUpdate,
  useRemove: useSlaPolicyRemove,
} = createCrudQueries<SlaPolicy, SlaPolicyInput>({ keys: slaPolicyKeys, api: slaPolicyApi });
