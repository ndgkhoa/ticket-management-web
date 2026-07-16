import type { RequestHandler } from 'msw';

/**
 * The single registry both the node server (tests) and the browser worker (the
 * static demo) load, so a request behaves identically in both.
 *
 * Deliberately empty: handlers describe the data contract, and that contract does
 * not exist yet — the API layer is still the legacy one being replaced. Inventing
 * handlers now would mock a shape nothing will ship. They land with the data layer.
 *
 * Until then, MSW is still doing work: `onUnhandledRequest: 'error'` in the test
 * setup means an unmocked request fails the test by name instead of escaping to
 * the network.
 */
export const handlers: RequestHandler[] = [];
