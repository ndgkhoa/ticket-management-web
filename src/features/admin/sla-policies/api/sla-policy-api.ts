import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import type { TicketPriority } from '~/features/tickets/schemas/ticket-enums';
import {
  SLA_POLICY_COLUMNS,
  slaPolicySchema,
  type SlaPolicy,
} from '~/features/admin/sla-policies/schemas/sla-policy-schema';

export type SlaPolicyInput = {
  name: string;
  priority: TicketPriority;
  first_response_mins: number;
  resolution_mins: number;
};

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
