import { z } from 'zod';

const envSchema = z
  .object({
    VITE_API_MODE: z.enum(['supabase', 'msw']).default('supabase'),

    VITE_SUPABASE_URL: z.preprocess((value) => value || undefined, z.url().optional()),
    VITE_SUPABASE_ANON_KEY: z.preprocess(
      (value) => value || undefined,
      z.string().min(1).optional()
    ),

    VITE_TURNSTILE_SITE_KEY: z.string().min(1).optional(),

    VITE_AI_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),

    VITE_SENTRY_DSN: z.preprocess((value) => value || undefined, z.url().optional()),
    VITE_POSTHOG_KEY: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
    VITE_POSTHOG_HOST: z.preprocess(
      (value) => value || undefined,
      z.url().default('https://us.i.posthog.com')
    ),
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
  console.error('Invalid environment variables:', z.treeifyError(parsed.error));
  throw new Error('Invalid environment variables — see the console for details.');
}

export const env = parsed.data;
