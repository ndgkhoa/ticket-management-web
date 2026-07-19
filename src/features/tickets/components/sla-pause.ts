/**
 * Effective SLA "now": wall time minus the time the ticket's SLA clock has been paused
 * (while pending/on_hold). Pure and epoch-ms in/out, so the card and the MSW mock share one
 * rule. Subtracting paused time from `now` (rather than adding it to the deadline) freezes the
 * countdown while paused and resumes it on return to an active status, without touching the
 * classifier.
 *
 * `pausedMs` is the banked total across finished pauses; `pausedAt` is the start of the current
 * pause (null when running), whose elapsed time is added live.
 */
export function effectiveNow(args: {
  now: number;
  pausedMs: number;
  pausedAt: number | null;
}): number {
  const { now, pausedMs, pausedAt } = args;
  const currentPause = pausedAt !== null ? Math.max(0, now - pausedAt) : 0;
  return now - pausedMs - currentPause;
}
