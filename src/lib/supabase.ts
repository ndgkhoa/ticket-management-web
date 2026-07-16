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
 * `env` has already refined that both values exist when `VITE_API_MODE=supabase`, so
 * the non-null assertions are discharged by that check rather than hopeful.
 *
 * In `msw` mode those vars may be absent, and `createClient(undefined, …)` throws
 * `supabaseUrl is required` **at import**, not on first use — so this module must
 * never be on a msw-reachable import path. The data-client indirection (Stage 3) is
 * responsible for that: it selects the mock path without importing this file. If a
 * lazier guarantee is ever needed, construct the client behind that switch rather
 * than at module scope.
 */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL!,
  env.VITE_SUPABASE_ANON_KEY!,
  {
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
  }
);
