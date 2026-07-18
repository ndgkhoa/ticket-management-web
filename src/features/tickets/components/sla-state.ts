export type SlaVariant = 'met' | 'met_late' | 'breached' | 'pending' | 'pending_soon';

/**
 * Classify one SLA target from timestamps (all epoch ms). Pure, so it's unit-testable on its own;
 * the card maps the returned variant to a label + colour.
 *
 * `doneAt` set → the target was hit: on time (`met`) or after the deadline (`met_late`). Otherwise
 * it's `breached` once overdue, `pending_soon` in the final quarter of the window, else `pending`.
 */
export function slaVariant(args: {
  createdAt: number;
  dueMinutes: number;
  doneAt: number | null;
  now: number;
}): { variant: SlaVariant; due: number } {
  const { createdAt, dueMinutes, doneAt, now } = args;
  const due = createdAt + dueMinutes * 60_000;

  if (doneAt !== null) {
    return { variant: doneAt <= due ? 'met' : 'met_late', due };
  }
  if (now > due) return { variant: 'breached', due };

  const soon = due - now < dueMinutes * 60_000 * 0.25;
  return { variant: soon ? 'pending_soon' : 'pending', due };
}
