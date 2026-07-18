import { describe, expect, it } from 'vitest';

import { slaVariant } from '~/features/tickets/components/sla-state';

const CREATED = 0;
const MINUTES = 60; // due at 60 min = 3_600_000 ms
const DUE = MINUTES * 60_000;

describe('slaVariant', () => {
  it('is met when the target was hit before the deadline', () => {
    expect(
      slaVariant({ createdAt: CREATED, dueMinutes: MINUTES, doneAt: DUE - 1, now: DUE + 999 })
        .variant
    ).toBe('met');
  });

  it('is met_late when the target was hit after the deadline', () => {
    expect(
      slaVariant({ createdAt: CREATED, dueMinutes: MINUTES, doneAt: DUE + 1, now: DUE + 999 })
        .variant
    ).toBe('met_late');
  });

  it('is breached when unmet and overdue', () => {
    expect(
      slaVariant({ createdAt: CREATED, dueMinutes: MINUTES, doneAt: null, now: DUE + 1 }).variant
    ).toBe('breached');
  });

  it('is pending_soon within the last quarter of the window', () => {
    // 10 min left of a 60-min window → inside the final 25% (15 min).
    const now = DUE - 10 * 60_000;
    expect(slaVariant({ createdAt: CREATED, dueMinutes: MINUTES, doneAt: null, now }).variant).toBe(
      'pending_soon'
    );
  });

  it('is pending when comfortably before the deadline', () => {
    // 40 min left → outside the final quarter.
    const now = DUE - 40 * 60_000;
    expect(slaVariant({ createdAt: CREATED, dueMinutes: MINUTES, doneAt: null, now }).variant).toBe(
      'pending'
    );
  });
});
