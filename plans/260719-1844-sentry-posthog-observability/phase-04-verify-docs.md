---
phase: 4
title: Verify & Docs
status: completed
priority: P2
effort: 1h
dependencies:
  - 1
  - 2
  - 3
---

# Phase 4: Verify & Docs

## Overview

Prove the two guarantees that matter — **no PII leaves the client** and **the SDKs never
load in msw/tests or the main chunk** — then document setup. No behavior code here.

## Requirements

- Functional: sanitizer/scrubber unit tests pass; both build modes green; a11y/lint unaffected.
- Non-functional: docs let a reader enable observability in <5 min.

## Related Code Files

- Create: `src/config/observability/observability-pii.test.ts` — unit tests for `scrubEvent`, `scrubBreadcrumb`, `sanitizeEvent`.
- Create/Modify: an e2e spec asserting session-replay/autocapture DOM masks ticket content (a11y-style blocking gate).
- Modify: `README.md` — short "Observability (optional)" section.
- Modify: `docs/system-architecture.md` — one paragraph on the observability boundary (dynamic import + reporter bridge).

## Implementation Steps

1. Unit tests (Vitest, no network) — cover the **allowlist** behavior, not just the email case:
   - `scrubEvent`: a free-text ticket subject (no email) in `extra`/message is dropped; `request.url`
     normalized to `/tickets/:id`, no query string.
   - `scrubBreadcrumb`: a PostgREST fetch breadcrumb with `?or=(subject.ilike.*term*)` + `/tickets/<uuid>`
     path is stripped/normalized or dropped.
   - `sanitizeEvent`: `$el_text` removed, `$current_url` path normalized to `:id`, query dropped.
2. Automated masking guard (RED-TEAM High — replace the manual-only check): an e2e/Playwright test
   loads the ticket detail with observability enabled against a known-PII fixture, and FAILS if any
   fixture ticket-body/subject string (or its attributes) appears in the serialized replay snapshot
   or an autocapture event. Wire it as a blocking gate, not a one-off manual look.
3. Bundle/mode checks:
   - `VITE_API_MODE=msw bun run build` → confirm no posthog/sentry code in the entry/main chunk
     (lazy chunks allowed, main bundle must be clean).
   - `bun run test` (msw mode) → confirm no PostHog/Sentry network attempts.
   - Prod smoke: run against a live key, verify `initObservability` runs (not dead-branched),
     `identify` carries `id` only, an intentional post-init error reaches Sentry.
4. Regression: `bun run lint`, `tsc -b`, `bun run test`, `bun run e2e` (a11y gate) all green.
5. Docs: README block (env vars + "leave blank to disable") and one architecture paragraph.
   Do not reference plan/phase numbers in code or docs prose.

## Success Criteria

- [ ] `scrubEvent`/`scrubBreadcrumb`/`sanitizeEvent` tests pass; cover free-text (non-email) PII,
      breadcrumb query filters, path-id normalization, and `$el_text`.
- [ ] Automated masking guard fails on an unmasked ticket-body/attribute leak; passes when masked.
- [ ] msw build/test: zero observability network calls; SDKs absent from main chunk.
- [ ] Prod smoke: `initObservability` runs, replay+autocapture masked, `identify` id-only,
      an intentional post-init error appears in Sentry.
- [ ] lint + typecheck + unit + e2e green.
- [ ] README + system-architecture updated (docs say "post-init errors", note the boot-window blind spot).

## Risk Assessment

- Risk: masking regressions later (new inputs unmasked). Mitigation: document the global
  mask default so contributors add `ph-no-capture` deliberately, not opt-in per field.
- Risk: docs drift. Mitigation: keep the README block minimal and env-driven.

## Unresolved questions

- Role in `identify`: the auth store exposes a permission-code `Set`, not a single role name.
  Plan ships **id-only** identify (safest, meets "never email"). If a coarse role property is
  wanted for funnels, surface a role name on the store first — deferred as out of scope.
