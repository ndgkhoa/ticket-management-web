import { z } from 'zod';

/**
 * Runtime-validated environment.
 *
 * Vite only exposes `VITE_`-prefixed vars to the client and inlines them at build
 * time, so this validates the values baked into the bundle. Parsing at module load
 * makes a bad config fail loudly at boot instead of surfacing later as a confusing
 * 404 or `undefined` in a request URL.
 */
const envSchema = z
  .object({
    /**
     * Where the app gets its data.
     *
     * `supabase` talks to the real project (`VITE_SUPABASE_*` below). `msw` starts the
     * Service Worker and answers every request from the mock handlers, which is what
     * lets tests and the static demo run with no backend at all.
     *
     * An enum rather than a boolean flag: `VITE_USE_MOCKS=false` reads as "off" while
     * saying nothing about what is on, and a third source (a hosted preview branch)
     * is plausible later.
     */
    VITE_API_MODE: z.enum(['supabase', 'msw']).default('supabase'),

    /**
     * Supabase project URL and anon key.
     *
     * Optional at the schema level because `msw` mode — the mode tests and the static
     * demo run in — needs neither. They are required only when `VITE_API_MODE` is
     * `supabase`, enforced by the refinement below so the failure is one clear message
     * at boot rather than an opaque "Invalid URL" from deep inside the client.
     *
     * The anon key is public by design: it identifies the project, not the caller, and
     * every row it can reach is gated by RLS. It ships in the client bundle exactly as
     * intended. The service-role key must never appear in any `VITE_`-prefixed var.
     */
    VITE_SUPABASE_URL: z.url().optional(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),

    /**
     * Cloudflare Turnstile site key (public). Optional: when unset, the auth forms skip
     * the captcha entirely — which is how tests, the MSW demo and a fresh checkout run
     * without a Cloudflare account. When set, Supabase's `[auth.captcha]` must be
     * configured to match, or sign-in rejects the (absent) token.
     */
    VITE_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  })
  .refine(
    (env) =>
      env.VITE_API_MODE !== 'supabase' ||
      (env.VITE_SUPABASE_URL !== undefined && env.VITE_SUPABASE_ANON_KEY !== undefined),
    {
      error:
        'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required when VITE_API_MODE=supabase. ' +
        'Set them (see .env.example), or set VITE_API_MODE=msw to run without a backend.',
      path: ['VITE_SUPABASE_URL'],
    }
  );

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // `z.treeifyError` is the Zod 4 replacement for the removed `error.format()`.
  console.error('Invalid environment variables:', z.treeifyError(parsed.error));
  throw new Error('Invalid environment variables — see the console for details.');
}

export const env = parsed.data;
