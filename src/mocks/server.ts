import { setupServer } from 'msw/node';

import { handlers } from '~/mocks/handlers';

/**
 * MSW in node — used by Vitest. Its lifecycle (listen/reset/close) belongs to
 * `src/testing/setup.ts` so every test file inherits it without wiring anything.
 *
 * Individual tests override behaviour with `server.use(...)`; the setup file
 * resets after each test so an override cannot leak sideways.
 */
export const server = setupServer(...handlers);
