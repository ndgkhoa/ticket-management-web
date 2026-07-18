/**
 * Query-key factory for canned responses.
 *
 * `list(params)` takes params because the library is server-side paginated (unbounded
 * growth, unlike the client-side lookup tables) — each page/sort/search combo is its
 * own cache entry, matching `user-keys.ts`.
 */
export const cannedResponseKeys = {
  all: ['canned_responses'] as const,
  list: (params?: unknown) => [...cannedResponseKeys.all, 'list', params] as const,
};
