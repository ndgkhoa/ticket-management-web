import type { RequestHandler } from 'msw';

import { authHandlers } from '~/mocks/handlers/auth-handlers';
import { restHandlers } from '~/mocks/handlers/rest-handlers';

/**
 * The single registry both the node server (tests) and the browser worker (the static
 * demo) load, so a request behaves identically in both.
 *
 * Auth handlers first: `user_roles` has a dedicated nested-read handler for the
 * permission query, and it must win over any future generic table handler for the same
 * path. Everything else is a plain PostgREST table read over the fixtures.
 *
 * `VITE_API_MODE=msw` is what activates these — the same fixtures that seed the live
 * database also answer here, so the demo runs with no backend and no live Supabase.
 */
export const handlers: RequestHandler[] = [...authHandlers, ...restHandlers];
