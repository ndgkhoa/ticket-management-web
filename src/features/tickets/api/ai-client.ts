import type { z } from 'zod';

import { env } from '~/config/env';
import { supabase } from '~/lib/supabase';

/**
 * Shared plumbing for calling an AI edge function.
 *
 * Every AI call goes through `supabase.functions.invoke` (the function holds the Gemini
 * key server-side), then validates the response against a Zod schema — the edge function
 * wraps an LLM, so its output is untrusted and can arrive in a shape you did not ask for.
 * A validation failure or a transport error both surface as a thrown Error, which the
 * calling hook turns into a graceful fallback rather than a crash.
 */

/** Whether the UI should offer AI affordances at all (see `VITE_AI_ENABLED`). */
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
