import type { RequestHandler } from 'msw';

import { authHandlers } from '~/mocks/handlers/auth-handlers';
import { userRolesHandlers } from '~/mocks/handlers/user-roles-handlers';
import { restHandlers } from '~/mocks/handlers/rest-handlers';

/**
 * The single registry both the node server (tests) and the browser worker (the static
 * demo) load, so a request behaves identically in both.
 *
 * `user_roles` has its own handler set (a shared mutable store read by both the auth
 * permission query and the admin role editor); it precedes the generic table handlers so
 * nothing else claims that path. Everything else is a plain PostgREST table read.
 *
 * `VITE_API_MODE=msw` is what activates these — the same fixtures that seed the live
 * database also answer here, so the demo runs with no backend and no live Supabase.
 */
export const handlers: RequestHandler[] = [...authHandlers, ...userRolesHandlers, ...restHandlers];
