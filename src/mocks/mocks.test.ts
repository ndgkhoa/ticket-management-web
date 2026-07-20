import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '~/mocks/server';

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
