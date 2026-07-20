import type { z } from 'zod';

import { env } from '~/config/env';
import { supabase } from '~/lib/supabase';

export const isAiEnabled = env.VITE_AI_ENABLED;

export async function invokeAiFunction<T>(
  name: string,
  body: Record<string, unknown>,
  schema: z.ZodType<T>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return schema.parse(data);
}
