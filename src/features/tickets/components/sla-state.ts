export type SlaVariant = 'met' | 'met_late' | 'breached' | 'pending' | 'pending_soon';

/**
 * Classify one SLA target from timestamps (all epoch ms). Pure, so it's unit-testable on its own;
 * the card maps the returned variant to a label + colour.
 *
 * `doneAt` set → the target was hit: on time (`met`) or after the deadline (`met_late`). Otherwise
 * it's `breached` once overdue, `pending_soon` in the final quarter of the window, else `pending`.
 */
export function slaVariant(args: {
  /** The deadline, epoch ms. The caller supplies it (the DB-maintained due for resolution,
   *  created + window for first response) rather than the classifier recomputing it, so a
   *  reopened ticket's restarted deadline is honoured. */
  due: number;
  /** The target's window in ms — used only for the "final quarter" pending_soon threshold. */
  windowMs: number;
  doneAt: number | null;
  /** Effective now — wall time minus SLA-paused time (see sla-pause). */
  now: number;
}): { variant: SlaVariant; due: number } {
  const { due, windowMs, doneAt, now } = args;

  if (doneAt !== null) {
    return { variant: doneAt <= due ? 'met' : 'met_late', due };
  }
  if (now > due) return { variant: 'breached', due };

  const soon = due - now < windowMs * 0.25;
  return { variant: soon ? 'pending_soon' : 'pending', due };
}
