import { QueryClient } from '@tanstack/react-query';

/**
 * The app's single QueryClient.
 *
 * A module singleton, not a factory: this is a client-only SPA, so there is no server
 * request to isolate a client per — the reason the factory pattern exists. Adding one
 * here would be ceremony for a hazard this app cannot have. Tests build their own
 * client (`testing/render.tsx`) so cache never leaks between them.
 *
 * Defaults are intentionally minimal:
 * - `staleTime` gives a short window where a cached result is served without a
 *   refetch, so returning to a list doesn't refire every query — without pinning the
 *   global `refetchOnMount: false` the old config used, which suppressed refetches
 *   everywhere and served stale data long after it mattered.
 * - `keepPreviousData` is deliberately NOT a global default. It belongs on paginated
 *   list queries, where holding the previous page while the next loads prevents a
 *   layout collapse — and nowhere else. As a global it also attached to detail and
 *   one-shot queries that have no "previous" worth keeping. Each list opts in with
 *   `placeholderData: keepPreviousData` on its own query.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
    },
  },
});
