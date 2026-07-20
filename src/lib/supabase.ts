import { createClient } from '@supabase/supabase-js';

import { env } from '~/config/env';
import type { Database } from '~/lib/database.types';

const supabaseUrl = env.VITE_SUPABASE_URL ?? 'http://msw.local';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? 'msw-placeholder-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'ticket-management-auth',
  },
});
