import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import type { TicketPriority } from '~/features/tickets/schemas/ticket-enums';
import {
  SLA_POLICY_COLUMNS,
  slaPolicySchema,
  type SlaPolicy,
} from '~/features/admin/sla-policies/schemas/sla-policy-schema';

/** What the create/edit form submits — the writable columns, nothing generated. */
export type SlaPolicyInput = {
  name: string;
  priority: TicketPriority;
  first_response_mins: number;
  resolution_mins: number;
};

/**
 * Data access for SLA policies: a bounded lookup table, so the list is a plain
 * fetch-all ordered read (client-side paged in the table). Writes go straight through
 * the SDK and re-validate the returned row into the domain model.
 */
export const slaPolicyApi = {
  list: async (): Promise<SlaPolicy[]> => {
    const { data } = await supabase
      .from('sla_policies')
      .select(SLA_POLICY_COLUMNS)
      .order('name')
      .throwOnError();
    return z.array(slaPolicySchema).parse(data);
  },

  create: async (input: SlaPolicyInput): Promise<SlaPolicy> => {
    const { data } = await supabase
      .from('sla_policies')
      .insert(input)
      .select(SLA_POLICY_COLUMNS)
      .single()
      .throwOnError();
    return slaPolicySchema.parse(data);
  },

  update: async (id: string, input: SlaPolicyInput): Promise<SlaPolicy> => {
    const { data } = await supabase
      .from('sla_policies')
      .update(input)
      .eq('id', id)
      .select(SLA_POLICY_COLUMNS)
      .single()
      .throwOnError();
    return slaPolicySchema.parse(data);
  },

  remove: async (id: string): Promise<void> => {
    await supabase.from('sla_policies').delete().eq('id', id).throwOnError();
  },
};
