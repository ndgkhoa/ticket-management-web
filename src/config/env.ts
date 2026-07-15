import { z } from 'zod';

/**
 * Runtime-validated environment.
 *
 * Vite only exposes `VITE_`-prefixed vars to the client and inlines them at build
 * time, so this validates the values baked into the bundle. Parsing at module load
 * makes a bad config fail loudly at boot instead of surfacing later as a confusing
 * 404 or `undefined` in a request URL.
 */
const envSchema = z.object({
  /**
   * Base URL of the API. An empty value is valid and means "same origin" — requests
   * go to relative paths, which is how the app runs against a dev proxy or a static
   * demo build.
   */
  VITE_BASE_API_URL: z.union([z.literal(''), z.url()]).default(''),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // `z.treeifyError` is the Zod 4 replacement for the removed `error.format()`.
  console.error('Invalid environment variables:', z.treeifyError(parsed.error));
  throw new Error('Invalid environment variables — see the console for details.');
}

export const env = parsed.data;
