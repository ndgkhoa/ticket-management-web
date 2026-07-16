import { createClient } from '@supabase/supabase-js';

import { env } from '~/config/env';
import type { Database } from '~/lib/database.types';

/**
 * The typed Supabase client — the single entry point to the live data source.
 *
 * Parameterised with the generated `Database` type, so every `.from('tickets')`
 * knows its columns and every row comes back typed straight from the schema. The
 * generated types are the contract; hand-writing a second copy is how the two drift.
 *
 * In `supabase` mode `env` has already refined that both values exist. In `msw` mode
 * they may be absent, and `createClient(undefined, …)` throws `supabaseUrl is required`
 * **at import** — so a placeholder URL/key stands in there. The app still talks to
 * supabase-js in both modes; MSW intercepts the HTTP at the network layer, so the
 * placeholder host is never actually contacted. That is what lets the same feature
 * code run unchanged against the live project and against the mock contract, which is
 * the whole point of the mode switch.
 */
const supabaseUrl = env.VITE_SUPABASE_URL ?? 'http://msw.local';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? 'msw-placeholder-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session and refresh it in the background — the SDK owns token
    // lifetime so the app never hand-rolls refresh (the bug the axios layer had).
    persistSession: true,
    autoRefreshToken: true,
    // Read the session back out of the redirect URL after an OAuth round-trip.
    detectSessionInUrl: true,
    // Distinct storage key, matching the convention the Zustand stores follow, so
    // nothing collides with them in localStorage.
    storageKey: 'ticket-management-auth',
  },
});
