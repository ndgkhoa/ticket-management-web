import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '~/mocks/server';

/**
 * Proves the MSW wiring itself, not any app endpoint.
 *
 * The handler registry is intentionally empty until the real data contract exists,
 * so there is nothing to assert against yet — but the plumbing has to be known-good
 * before handlers are written on top of it, or the first failing data test has two
 * possible causes instead of one.
 *
 * `fetch` rather than a client wrapper: supabase-js issues plain `fetch` under the
 * hood, so intercepting `fetch` is exactly what makes the whole app answerable from
 * mocks in msw mode. Handlers are registered per-test with `server.use`; the shared
 * setup resets them afterwards.
 */
describe('MSW wiring', () => {
  it('intercepts fetch requests', async () => {
    server.use(http.get('https://api.test/probe', () => HttpResponse.json({ ok: true })));

    const response = await fetch('https://api.test/probe');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('lets a handler drive the failure path', async () => {
    server.use(
      http.get('https://api.test/boom', () =>
        HttpResponse.json({ message: 'nope' }, { status: 500 })
      )
    );

    const response = await fetch('https://api.test/boom');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });

  it('passes request headers through to the handler', async () => {
    let seenAuth: string | null = null;
    server.use(
      http.get('https://api.test/whoami', ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      })
    );

    await fetch('https://api.test/whoami', { headers: { authorization: 'Bearer tok-123' } });

    expect(seenAuth).toBe('Bearer tok-123');
  });
});
