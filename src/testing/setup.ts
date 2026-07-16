import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { server } from '~/mocks/server';

/**
 * jsdom implements neither of these, and antd's rc-* internals call both during
 * render — without them every component test throws before it asserts anything.
 * They are environment gaps, not app behaviour, so they are stubbed once here
 * rather than in each test.
 */
beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );

  // A class, not `vi.fn().mockImplementation(() => ({...}))`. An arrow function is not
  // a constructor, so `new ResizeObserver(...)` — which is the only way anything calls
  // it — would throw "is not a constructor" and merely trade one error for another.
  // Nothing catches this today only because no test yet renders a size-observing
  // component; the next one would.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
  );
});

/**
 * `onUnhandledRequest: 'error'` on purpose. The default only warns, which lets a
 * test quietly hit the network — that is how a suite becomes both slow and flaky
 * without anyone noticing. A request with no handler should fail loudly and name
 * itself.
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  // React trees must be unmounted between tests: `globals: false` means Testing
  // Library cannot register its own automatic cleanup.
  cleanup();
  // Handlers added by a single test via server.use() must not leak into the next.
  server.resetHandlers();
});

afterAll(() => server.close());
