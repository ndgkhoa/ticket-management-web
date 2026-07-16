import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { axiosClient } from '~/lib/axios';
import { server } from '~/mocks/server';
import { useAuthStore } from '~/stores/auth';

// The auth store is a module singleton, so a test that signs in leaks into the next
// one unless this runs even when the test throws. Cleanup at the end of a test body
// only happens on the happy path.
afterEach(() => {
  useAuthStore.getState().logout();
  localStorage.clear();
});

/**
 * Proves the MSW wiring itself, not any app endpoint.
 *
 * The handler registry is intentionally empty until the real data contract exists,
 * so there is nothing to assert against yet — but the plumbing has to be known-good
 * before handlers are written on top of it. Otherwise the first failing data test
 * has two possible causes instead of one.
 *
 * Handlers are registered per-test with `server.use`; the shared setup resets them
 * afterwards.
 */
describe('MSW wiring', () => {
  it('intercepts requests made through the app axios client', async () => {
    server.use(
      http.get('https://api.test/probe', () => HttpResponse.json({ Data: 'intercepted' }))
    );

    const response = await axiosClient.get('https://api.test/probe');

    expect(response.data).toEqual({ Data: 'intercepted' });
  });

  it('lets a handler drive the failure path', async () => {
    server.use(
      http.get('https://api.test/boom', () =>
        HttpResponse.json({ Message: 'nope' }, { status: 500 })
      )
    );

    await expect(axiosClient.get('https://api.test/boom')).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it('applies the axios request interceptor to mocked requests', async () => {
    // The token is read from the store per request, so MSW sees exactly what a real
    // server would — which is what makes auth testable at all.
    useAuthStore.getState().setAuth({
      UserId: 'u1',
      AccessToken: 'tok-123',
      isAuthenticated: true,
      provider: 'local',
    });

    let seenAuth: string | null = null;
    server.use(
      http.get('https://api.test/whoami', ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ Data: 'ok' });
      })
    );

    await axiosClient.get('https://api.test/whoami');
    expect(seenAuth).toBe('Bearer tok-123');

    // Logging out must drop the header on the very next request, with no reload —
    // the bug this interceptor replaced kept it until the page was refreshed.
    useAuthStore.getState().logout();
    await axiosClient.get('https://api.test/whoami');
    expect(seenAuth).toBeNull();
  });
});
