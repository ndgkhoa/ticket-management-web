# Phase 09 — Polish, Docs, Deploy

**Priority:** P2 · **Status:** ⬜ todo · **Depends:** all prior

## Overview

Turn a working app into a _portfolio piece_: accessibility + performance passes, great docs, and a live deployed demo with seeded accounts. This is what recruiters actually click.

## Requirements

### Quality

- **a11y:** jest-axe on key screens green; keyboard nav audit; focus management in dialogs.
- **Lighthouse CI** in GitHub Actions with perf/a11y/best-practices budgets (fail PR on regression).
- Responsive/mobile pass on ticket list + detail + dashboard.
- Bundle check: route code-splitting verified, no accidental large imports.

### Docs

- **README** overhaul: hero screenshot/GIF, live demo link + demo credentials, tech-stack badges, feature list, architecture diagram, local setup, testing, CI badges.
- `docs/`: `system-architecture.md`, `code-standards.md`, `deployment-guide.md`, `project-overview-pdr.md`.
- **ADRs** for key decisions (TanStack Router over RRD, shadcn over antd, MSW+Supabase, AI via edge functions, **Gemini over Claude — Anthropic ships no embeddings API, plus the free-tier data trade-off**, **TypeScript 6 not 7 — typescript-eslint doesn't support 7 yet**). ADRs are where a recruiter sees you weighed trade-offs instead of picking by hype; each of these has a real "we rejected X because Y" behind it.

### Deploy — everything on free tiers (verified 2026-07-15)

- **Cloudflare Pages** (frontend) + **Supabase** (backend); env wired; preview deploys per PR.
  - Vite SPA is a plain static build — Pages fits with no adapter. **SPA fallback is mandatory:** add `public/_redirects` with `/*  /index.html  200`, or deep links (`/tickets/abc`) 404 on refresh. This is the one thing that bites every SPA on Pages, and only on refresh/direct-link — never during local dev, so it ships unnoticed.
  - Free plan: **500 deploys/month**. Preview-per-PR consumes that budget — fine for one person, worth knowing before wiring a deploy to every push.
  - Vercel Hobby (100 GB transfer, 1M invocations) also fits and is personal/non-commercial only — either works. Pages was chosen; don't relitigate without a reason.

- **The CV demo link runs `VITE_API_MODE=msw`, and that is the primary demo.** Not a fallback.
  - **Why this matters more than it looks: Supabase free pauses a project after 1 week of inactivity.** A CV link that sits idle for two weeks and then gets clicked by a recruiter hits a paused backend. The moment the demo matters most is exactly the moment it's least likely to be awake — and nothing notifies you.
  - MSW mode runs entirely in the browser: no backend, no pause, no cold start, nothing to keep alive. The link cannot rot.
  - The Supabase deployment stays as the _live_ demo for interviews (realtime, RLS, presence — things MSW can't show), brought up deliberately when you're there to watch it. Link it from the README as "live backend demo" and note it may need a moment to wake.
  - Corollary: MSW handlers are a **shipped artifact**, not test scaffolding. They must stay in sync with the Supabase contract for the life of the project (Phase 03's parity test is what guarantees it).

- Seed demo data + demo accounts (owner/admin/agent/customer) with a reset routine.

### Free-tier ceilings — the numbers that actually constrain this

| Service          | Free tier                                                                                              | Fits?                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Cloudflare Pages | 500 deploys/month                                                                                      | Yes                                                                    |
| Supabase         | 2 projects, 500 MB DB, 1 GB storage, 500k edge invocations, 5 GB egress — **paused after 1 week idle** | Yes, with the pause caveat above                                       |
| Chromatic        | 5,000 snapshots/month                                                                                  | Only with the Phase 02 guardrails                                      |
| Gemini API       | Flash + both embedding models free; free-tier content is used to improve Google's products             | Yes — all data is seeded demo tickets (Phase 07 records the trade-off) |

**Total running cost: $0.** No card required on any of the four.

## Related code files

- Create: `README.md` (rewrite), `docs/**`, `docs/adr/**`, `.github/workflows/lighthouse.yml`, `public/_redirects` (SPA fallback — see above).
- Modify: CI to add Lighthouse job; env docs.

## Implementation steps

1. a11y sweep (jest-axe + manual keyboard) + fixes.
2. Add Lighthouse CI job + budgets.
3. Responsive polish.
4. Rewrite README + write docs/ + ADRs + architecture diagram.
5. Deploy the MSW demo build to Cloudflare Pages (`VITE_API_MODE=msw`) + `_redirects`; **verify a deep link survives a hard refresh** before calling it done.
6. Deploy Supabase prod + the live-backend build; wire env + preview deploys.
7. Seed demo accounts/data + reset routine; verify both demos end-to-end.
8. Final CI green; add all badges.

## Todo

- [ ] a11y green (jest-axe + keyboard)
- [ ] Lighthouse CI + budgets
- [ ] Responsive pass
- [ ] README rewrite + docs/ + ADRs + architecture diagram
- [ ] Cloudflare Pages: MSW demo build + `_redirects` + deep-link-after-refresh verified
- [ ] Supabase prod + live-backend build + preview deploys
- [ ] Demo accounts/data + reset + both demos verified
- [ ] All CI badges green

## Success criteria

Public live demo with working demo logins; Lighthouse/a11y budgets pass in CI; README tells the full story at a glance. **The CV link works with zero running backend**, and keeps working after weeks of no traffic.

## Risks

- Demo data drift/abuse — periodic reset (scheduled function) + read-mostly demo roles.
- Secrets in deploy — verify only public keys client-side. The Supabase anon key is public **by design** and safe to ship; RLS is what protects the data, which is why Phase 03's policy tests are load-bearing, not box-ticking. The service-role key must never reach the client bundle.
- **Missing `_redirects` fails only on refresh/deep-link** — never in dev, never on first load from the homepage. Test the failure mode explicitly.
- A CV demo on a paused/expired backend is a silent failure with no alert. MSW-first removes the failure mode rather than monitoring it.

## Audit notes (2026-07-19) — coverage gaps found

Existing e2e (9 specs) + unit/integration (140 pass) are solid. Gaps to fold into this phase:

- **E2E doesn't cover the domain-gaps features** (plan `260719-0001`): triage-queue visibility, SLA pause/badge, audit trail (team/category events), read-only customer detail, canned-response picker. Unit + MSW cover them; add browser-level e2e here.
- **Storybook is thin** — only 6 primitive stories (button, input, badge, field-text, data-table, ticket-badges). Feature components (composer, sla-card, properties, activity, ai-suggestion-panel, canned-response-picker, bulk-actions-bar, saved-views-menu) have none. Add **selectively** — Chromatic's 5k-snapshot/mo budget means don't blanket every component.
- Seed `attachments` is intentionally empty (in-session blob uploads). Optionally seed 1-2 sample attachments for a richer first-load demo.
- Confirmed still absent (already in Todo, re-flagged): `public/_redirects` (deep-link-refresh 404 is the classic silent SPA-on-Pages failure), `.github/workflows/lighthouse.yml`, and `docs/{system-architecture,deployment-guide,project-overview-pdr}.md` + ADRs (`docs/` currently holds only `ai-features.md` + `code-standards.md`).
