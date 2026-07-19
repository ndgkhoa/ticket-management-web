import { describe, expect, it } from 'vitest';

import { effectiveNow } from '~/features/tickets/components/sla-pause';

const NOW = 10_000_000;
const HOUR = 3_600_000;

describe('effectiveNow', () => {
  it('is wall time when never paused', () => {
    expect(effectiveNow({ now: NOW, pausedMs: 0, pausedAt: null })).toBe(NOW);
  });

  it('subtracts banked paused time', () => {
    expect(effectiveNow({ now: NOW, pausedMs: 2 * HOUR, pausedAt: null })).toBe(NOW - 2 * HOUR);
  });

  it('adds the live elapsed of the current pause', () => {
    // Paused 1h ago and still paused → effective now is frozen 1h back.
    expect(effectiveNow({ now: NOW, pausedMs: 0, pausedAt: NOW - HOUR })).toBe(NOW - HOUR);
  });

  it('freezes: while paused, effective now does not advance', () => {
    const pausedAt = NOW - HOUR;
    const a = effectiveNow({ now: NOW, pausedMs: 0, pausedAt });
    const b = effectiveNow({ now: NOW + HOUR, pausedMs: 0, pausedAt });
    expect(a).toBe(b); // both equal pausedAt — the clock is frozen
    expect(a).toBe(pausedAt);
  });

  it('combines banked and current pause', () => {
    expect(effectiveNow({ now: NOW, pausedMs: HOUR, pausedAt: NOW - HOUR })).toBe(NOW - 2 * HOUR);
  });
});
