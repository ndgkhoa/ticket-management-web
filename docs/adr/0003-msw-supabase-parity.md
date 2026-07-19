# ADR-0003: MSW + Supabase Parity (Dev/Test Fidelity)

**Date:** 2026-07-15 | **Status:** Accepted | **Priority:** P1

## Context

The app runs in two modes:

- **MSW (Mock Service Worker):** Browser-based API mocks for local dev + test suite (offline, no network)
- **Supabase:** Live Postgres database for deployed app (realtime, RLS, Edge Functions active)

Problem: Postgres **triggers** (domain invariants) do not run under MSW. Example — when a ticket is created:

- **Supabase (production):** Trigger runs, stamps `due_at` from SLA policy
- **MSW (dev/test):** No trigger. Handler returns stale data. Tests see different behavior than production.

This is a silent failure: test passes locally, breaks in production. Solution: Every database trigger gets a **mirrored mock** in MSW. Parity is guarded by an integration test.

## Decision

**Every Postgres trigger must have a MSW mirror in `src/mocks/**`.** Maintain parity between Supabase triggers and MSW handlers as a first-class testing requirement. A parity test runs in CI (`npm run test:parity`) to catch drift before merge.

## Consequences

**Positive:**

- **Dev/test environment is faithful to production.** Local `npm run test` and `bun run dev` see the same invariants (SLA stamping, triage routing, lifecycle, audit) as the live Supabase backend.
- **Tests catch regressions early.** Unit + component tests run against MSW; parity test verifies they match Supabase behavior. Any divergence is caught before deployment.
- **One source of truth (the behavior).** Trigger code is in Postgres SQL; mock code mirrors it in TypeScript. Any schema change requires updating both; the parity test enforces it.
- **Confidence in TDD.** Write tests against MSW (fast, offline, deterministic), then deploy to Supabase and know it will work the same way.

**Negative:**

- **Extra work:** Every trigger requires a parallel mock handler. Roughly 1.5× the implementation effort (write trigger, then write mirror).
- **Duplication risk:** If trigger logic changes and the mock isn't updated, the parity test fails. Requires discipline in code review.
- **Complexity hidden.** A recruiter reading the code sees MSW handlers + Supabase functions living separately. Documentation is essential (this ADR + inline comments).

## Examples

### SLA Stamping Trigger (Supabase)

```sql
CREATE TRIGGER set_ticket_due_at
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_due_at_from_policy();

CREATE FUNCTION set_ticket_due_at_from_policy() RETURNS TRIGGER AS $$
BEGIN
  SELECT due_offset INTO NEW.due_at
  FROM sla_policies
  WHERE org_id = NEW.org_id AND priority = NEW.priority;
  NEW.due_at := NOW() + (SELECT due_offset FROM sla_policies WHERE priority = NEW.priority);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### MSW Mirror (TypeScript)

```typescript
// src/mocks/handlers/tickets.ts
import { http, HttpResponse } from 'msw';
import { slaPoliciesByPriority } from '../fixtures/sla-policies';

http.post('/api/tickets', async ({ request }) => {
  const body = await request.json();

  const slaPolicy = slaPoliciesByPriority.get(body.priority);
  const dueAt = new Date(Date.now() + slaPolicy.due_offset_ms);

  const ticket = {
    ...body,
    due_at: dueAt.toISOString(),
    status: 'open',
  };

  return HttpResponse.json({ data: ticket });
});
```

Both apply the same rule: if priority = high, due_at = now + 8 hours. The trigger runs in production; the mock runs in tests + static demo.

### Parity Test

```typescript
// src/mocks/lib/apply-list-query.integration.test.ts
describe('MSW parity: ticket triggers', () => {
  it('should stamp due_at from sla_policy on create', async () => {
    // Create via MSW
    const mswTicket = await mswClient.tickets.create({
      priority: 'high',
      org_id: 'org-1',
    });

    // Same call to Supabase (with schema + triggers)
    const supabaseTicket = await supabaseClient.tickets.create({
      priority: 'high',
      org_id: 'org-1',
    });

    // Both should have identical due_at
    expect(mswTicket.due_at).toEqual(supabaseTicket.due_at); // within 1 second
  });
});
```

Runs in CI with `RUN_INTEGRATION=1 npm run test:parity`. If MSW and Supabase diverge, the test catches it.

## Implementation Pattern

For each domain invariant:

1. **Write the trigger** in Supabase migrations (`supabase/migrations/NNNN_xxx.sql`)
2. **Write the mock handler** in `src/mocks/handlers/**/*.ts` that applies the same logic
3. **Write the parity test** in `src/mocks/lib/apply-list-query.integration.test.ts`
4. Commit all three together

CI runs parity tests against both MSW (in-memory) and a local Supabase instance to verify they agree.

## Triggers Currently Mirrored

| Trigger                   | MSW Location                       | Parity Test |
| ------------------------- | ---------------------------------- | ----------- |
| SLA due_at stamping       | `src/mocks/handlers/tickets.ts`    | ✅          |
| Triage queue assignment   | `src/mocks/handlers/triage.ts`     | ✅          |
| Status lifecycle (reopen) | `src/mocks/handlers/activities.ts` | ✅          |
| SLA clock pause           | `src/mocks/handlers/tickets.ts`    | ✅          |
| Audit trail events        | `src/mocks/handlers/audit.ts`      | ✅          |

## Risks Mitigated

- **"Works in tests but fails in production":** Parity test catches it immediately. Every trigger is mirrored, so tests see production behavior.
- **"Forgot to update the trigger mirror":** Code review + parity test fail if a PR adds a Supabase trigger without a MSW handler. Prevents silent drift.
- **"Test suite needs Supabase running":** MSW handles all API calls; local tests run offline, fast, and deterministic. No docker/network dependency.

## Related Decisions

- **ADR-0004** (Edge Functions): Server-side AI calls also have MSW mirrors for mocked responses
- MSW parity is enforced by test; production deployment uses live Supabase backend (ADR doesn't claim to ship MSW, only to maintain parity)

## Trade-off

Parity maintenance cost is worth the benefit: dev/test environment stays faithful to production by construction. Every merge that changes a trigger is verified (via parity test) to match its MSW mirror before landing.
