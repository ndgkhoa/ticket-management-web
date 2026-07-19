import { describe, expect, it } from 'vitest';

import { slaVariant } from '~/features/tickets/components/sla-state';

const MINUTES = 60;
const WINDOW = MINUTES * 60_000;
const DUE = WINDOW; // deadline at 60 min

describe('slaVariant', () => {
  it('is met when the target was hit before the deadline', () => {
    expect(
      slaVariant({ due: DUE, windowMs: WINDOW, doneAt: DUE - 1, now: DUE + 999 }).variant
    ).toBe('met');
  });

  it('is met_late when the target was hit after the deadline', () => {
    expect(
      slaVariant({ due: DUE, windowMs: WINDOW, doneAt: DUE + 1, now: DUE + 999 }).variant
    ).toBe('met_late');
  });

  it('is breached when unmet and overdue', () => {
    expect(slaVariant({ due: DUE, windowMs: WINDOW, doneAt: null, now: DUE + 1 }).variant).toBe(
      'breached'
    );
  });

  it('is pending_soon within the last quarter of the window', () => {
    // 10 min left of a 60-min window → inside the final 25% (15 min).
    const now = DUE - 10 * 60_000;
    expect(slaVariant({ due: DUE, windowMs: WINDOW, doneAt: null, now }).variant).toBe(
      'pending_soon'
    );
  });

  it('is pending when comfortably before the deadline', () => {
    // 40 min left → outside the final quarter.
    const now = DUE - 40 * 60_000;
    expect(slaVariant({ due: DUE, windowMs: WINDOW, doneAt: null, now }).variant).toBe('pending');
  });

  it('credits paused time to the met/late judgment (the card passes an effective doneAt)', () => {
    // 60-min window, resolved at wall +80m, but 30m was paused → effective done +50m ≤ due.
    const doneWall = 80 * 60_000;
    const pausedMs = 30 * 60_000;
    const nowAfter = 999 * 60_000;
    expect(
      slaVariant({ due: DUE, windowMs: WINDOW, doneAt: doneWall - pausedMs, now: nowAfter }).variant
    ).toBe('met');
    // Without the pause credit the same ticket would read as met-late.
    expect(
      slaVariant({ due: DUE, windowMs: WINDOW, doneAt: doneWall, now: nowAfter }).variant
    ).toBe('met_late');
  });
});
