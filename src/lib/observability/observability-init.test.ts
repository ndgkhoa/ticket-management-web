import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';

import type * as AuthModule from '~/stores/auth';
import type * as ObservabilityModule from '~/lib/observability';

const mocks = vi.hoisted(() => ({
  env: {
    VITE_SENTRY_DSN: undefined as string | undefined,
    VITE_POSTHOG_KEY: undefined as string | undefined,
    VITE_POSTHOG_HOST: 'https://ph.example.com',
  },
  initSentry: vi.fn(),
  setSentryUser: vi.fn(),
  initPostHog: vi.fn(),
  identifyUser: vi.fn(),
  resetUser: vi.fn(),
}));

vi.mock('~/config/env', () => ({ env: mocks.env }));

vi.mock('~/lib/observability/sentry', () => ({
  initSentry: mocks.initSentry,
  setSentryUser: mocks.setSentryUser,
}));

vi.mock('~/lib/observability/posthog', () => ({
  initPostHog: mocks.initPostHog,
  identifyUser: mocks.identifyUser,
  resetUser: mocks.resetUser,
}));

let auth: typeof AuthModule;
let observability: typeof ObservabilityModule;

const signIn = (userId: string) =>
  auth.useAuthStore
    .getState()
    .applySession({ user: { id: userId } } as unknown as Session, new Set());

const signOut = () => auth.useAuthStore.getState().applySession(null, new Set());

const enableBoth = () => {
  mocks.env.VITE_SENTRY_DSN = 'https://key@sentry.example.com/1';
  mocks.env.VITE_POSTHOG_KEY = 'ph-key';
};

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.env.VITE_SENTRY_DSN = undefined;
  mocks.env.VITE_POSTHOG_KEY = undefined;

  vi.resetModules();
  auth = await import('~/stores/auth');
  observability = await import('~/lib/observability');
});

describe('initObservability wiring', () => {
  it('initialises nothing when neither provider is configured', async () => {
    await observability.initObservability();
    signIn('u1');

    expect(mocks.initSentry).not.toHaveBeenCalled();
    expect(mocks.initPostHog).not.toHaveBeenCalled();
    expect(mocks.setSentryUser).not.toHaveBeenCalled();
    expect(mocks.identifyUser).not.toHaveBeenCalled();
  });

  it('starts only sentry when only its dsn is set', async () => {
    mocks.env.VITE_SENTRY_DSN = 'https://key@sentry.example.com/1';

    await observability.initObservability();

    expect(mocks.initSentry).toHaveBeenCalledWith('https://key@sentry.example.com/1');
    expect(mocks.initPostHog).not.toHaveBeenCalled();
  });

  it('starts posthog with its configured host', async () => {
    mocks.env.VITE_POSTHOG_KEY = 'ph-key';

    await observability.initObservability();

    expect(mocks.initPostHog).toHaveBeenCalledWith('ph-key', 'https://ph.example.com');
  });

  it('keeps going when a provider fails to start', async () => {
    enableBoth();
    mocks.initSentry.mockImplementationOnce(() => {
      throw new Error('bad dsn');
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await observability.initObservability();
    signIn('u1');

    expect(consoleError).toHaveBeenCalled();
    expect(mocks.initPostHog).toHaveBeenCalled();
    expect(mocks.identifyUser).toHaveBeenCalledWith('u1');
    expect(mocks.setSentryUser).not.toHaveBeenCalled();
  });
});

describe('initObservability user sync', () => {
  beforeEach(enableBoth);

  it('adopts the user already signed in at startup', async () => {
    signIn('u1');

    await observability.initObservability();

    expect(mocks.setSentryUser).toHaveBeenCalledWith('u1');
    expect(mocks.identifyUser).toHaveBeenCalledWith('u1');
    expect(mocks.resetUser).not.toHaveBeenCalled();
  });

  it('identifies a user who signs in later', async () => {
    await observability.initObservability();

    signIn('u1');

    expect(mocks.setSentryUser).toHaveBeenLastCalledWith('u1');
    expect(mocks.identifyUser).toHaveBeenCalledWith('u1');
  });

  it('clears both providers on sign out', async () => {
    await observability.initObservability();
    signIn('u1');
    mocks.setSentryUser.mockClear();

    signOut();

    expect(mocks.setSentryUser).toHaveBeenCalledWith(null);
    expect(mocks.resetUser).toHaveBeenCalled();
  });

  it('resets posthog before identifying a different user', async () => {
    await observability.initObservability();
    signIn('u1');
    mocks.resetUser.mockClear();
    mocks.identifyUser.mockClear();

    signIn('u2');

    expect(mocks.resetUser).toHaveBeenCalled();
    expect(mocks.identifyUser).toHaveBeenCalledWith('u2');
    expect(mocks.resetUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.identifyUser.mock.invocationCallOrder[0]
    );
  });

  it('ignores store updates that leave the user unchanged', async () => {
    await observability.initObservability();
    signIn('u1');
    mocks.identifyUser.mockClear();

    signIn('u1');

    expect(mocks.identifyUser).not.toHaveBeenCalled();
  });
});
