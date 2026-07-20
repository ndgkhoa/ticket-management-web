# ADR-0008: Sentry + PostHog Observability with PII Scrubbing

**Date:** 2026-07-19 | **Status:** Accepted | **Priority:** P2

## Context

A deployed help-desk handles real user text — ticket subjects, message bodies, email addresses. Once it runs live, two questions matter: _what broke_ (errors) and _what did people do_ (product analytics). Doing both without a plan risks either flying blind or, worse, shipping user PII into a third-party SaaS.

Requirements:

- Error monitoring with stack traces + release context.
- Product analytics (pageviews, feature usage) and optional session replay.
- **No PII leaves the browser** — help-desk content is sensitive by default.
- The instrumentation must not bloat the main bundle for users who never trigger it.

## Decision

Adopt **two focused tools** behind a thin internal boundary:

- **Sentry** (`@sentry/react`) for error + performance monitoring.
- **PostHog** (`posthog-js`) for product analytics + masked session replay.

Both are wired through `src/lib/observability/`, loaded via a single dynamic `import()` in `src/main.tsx`, and every payload passes an allowlist PII scrub before it is sent.

## Why This Shape

### One reporter bridge, two vendors behind it

The app never imports Sentry or PostHog directly. It calls a small internal **reporter** (`src/lib/observability/reporter.ts`) whose default implementation is a no-op. On boot, `main.tsx` dynamically imports the real observability module, which swaps the no-op for the vendor-backed reporter.

Two payoffs:

- **Bundle isolation** — the SDKs sit behind a dynamic `import()`, so they land in a separate chunk instead of the critical path. A first paint doesn't wait on analytics code.
- **Swappable vendors** — call sites depend on the bridge, not on Sentry/PostHog APIs. Replacing or removing a vendor is a change in one module, not a repo-wide edit.

### PII scrubbing is an allowlist, not a blocklist

`src/lib/observability/pii-scrub.ts` strips event payloads down to a known-safe set of fields rather than trying to enumerate everything sensitive. A blocklist fails the moment a new field appears; an allowlist fails _closed_ — an unrecognized field is dropped, not leaked.

- User identity is synced **id-only** — no email, no name.
- Session replay masks all inputs and text (`maskAllInputs`, `mask_all_text`), so recordings show interaction shape, not content.
- Sentry's `before_send` / PostHog's `before_send` run the same sanitizer, so both pipelines are scrubbed by one code path.

### Everything self-gates on env

Each integration initializes only when its DSN/key is present (`VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`). No keys → the no-op reporter stays, and local dev / tests run with zero telemetry. Empty-string secrets from CI are coerced to unset (see env handling), so a blank var never half-initializes a vendor.

## Trade-Offs

| Aspect               | Two focused tools (chosen)      | One all-in-one platform |
| -------------------- | ------------------------------- | ----------------------- |
| **Errors**           | Sentry (best-in-class traces)   | Often weaker error UX   |
| **Analytics/replay** | PostHog (masked replay)         | Bundled but shallower   |
| **Bundle cost**      | Isolated via dynamic import     | Same, if lazy-loaded    |
| **PII control**      | Single allowlist scrub for both | Vendor-dependent        |
| **Vendor lock-in**   | Low — swap behind the bridge    | Higher                  |
| **Free tier**        | Both have generous free tiers   | Varies                  |
| **Decision**         | **Chosen**                      | Not for this repo       |

The cost is running two integrations instead of one; the reporter bridge absorbs that by giving both a single call surface and a single scrub path.

## Alternatives Considered

### Sentry only (errors), skip analytics

Simpler, but loses product-usage insight and session replay — the "what did users do before the error" context that makes a help-desk demo credible.

### A single all-in-one platform

One vendor for errors + analytics reduces moving parts, but its error tooling is typically weaker than Sentry's and PII controls vary. The bridge already makes two vendors cheap to operate.

### No PII scrubbing, rely on vendor settings

Vendor-side scrubbing is a config toggle that's easy to misconfigure and invisible in code review. An in-repo allowlist is explicit, testable (`pii-scrub.test.ts`), and reviewed like any other logic.

### Static import of the SDKs

Simplest wiring, but pins the SDK bytes into the main bundle for every visitor. The dynamic import keeps the critical path lean at the cost of one extra async boundary at startup.

## Related Decisions

- **ADR-0004** (AI via Edge Functions): both keep secrets and heavy dependencies off the client — observability SDKs behind a dynamic chunk, AI keys behind the edge.
- **Empty-string-env-as-unset** (see `code-standards.md` / env handling): the reason a blank CI secret can't accidentally half-enable a vendor.

## Rationale

Observability on a live app is a data-handling decision as much as a tooling one. Two specialized tools give the best error and analytics experience; a reporter bridge makes them swappable and bundle-cheap; an allowlist scrub makes "no PII leaves the browser" a property the code enforces rather than a promise the config hopes to keep.

---

**Brought to you by a recruiter reading your code and thinking: "They instrumented the app for production _and_ made sure it doesn't leak the users it's watching."**
