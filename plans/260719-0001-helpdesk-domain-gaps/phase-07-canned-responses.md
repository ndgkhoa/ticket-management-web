# Phase 07 — Consume Canned Responses (Composer Picker + AI)

**Priority:** P3 · **Status:** ⬜ todo · **Depends:** none

## Context

- [Audit report](../reports/from-domain-audit-to-planner-helpdesk-business-logic-report.md) gap #9 (managed but never consumed — confirmed)
- `supabase/migrations/20260716120300_sla_policies_and_canned_responses.sql:19-29` — `canned_responses` table
- `supabase/migrations/20260716120500_row_level_security.sql:181-188` — read gated on `canned.read`
- `src/features/tickets/api/suggest-reply.ts:12-16` — `SuggestReplyInput.cannedResponses?` param exists (stubbed)
- `src/features/tickets/components/ai-suggestion-panel.tsx:40-47` — caller never passes `cannedResponses`
- `src/features/tickets/components/ticket-composer.tsx` — no canned-response picker
- `src/features/admin/canned-responses/**` — existing admin CRUD (locate exact path)

## Overview

Canned responses have full admin CRUD but are **never consumed**: the composer has no picker, and
the only `ai-suggest-reply` caller never passes `cannedResponses` (`ai-suggestion-panel.tsx:40-47`)
even though the input type already supports it (`suggest-reply.ts:14`). Wire both ends — the
plumbing is already stubbed, so this is mostly frontend.

## Key insights from the audit

- The AI side is a one-line gap: `suggestReplyApi.draft` already accepts `cannedResponses?: string[]`
  (`suggest-reply.ts:12-16`); the caller just doesn't supply them. Fetch canned bodies and pass them.
- Reads are gated by `canned.read` (`row_level_security.sql:181`), which the `agent` role holds
  (`seed.sql:259` → permission `00000...009`). So agents can already fetch them; only the UI is
  missing.
- Two consumption points, one data source: a **composer picker** (insert a canned body into the
  Tiptap editor) and the **AI draft** (feed bodies as context). Reuse one `useCannedResponseList`
  query for both (DRY).

## Requirements

**Functional**

- **Composer picker:** in `ticket-composer.tsx`, a control (dropdown/command palette) listing canned
  responses by title; selecting one inserts its body into the editor (respecting the existing
  `draftToHtml` conversion / Tiptap content model). Visible only to holders of `canned.read`.
- **AI feed:** `ai-suggestion-panel.tsx` passes the canned-response bodies as `cannedResponses` to
  `useSuggestReply`, so drafts can reference the approved library.

**Non-functional**

- Query via TanStack Query key factory; reuse any existing `canned-responses` feature query rather
  than a new fetcher.
- i18n for the picker label/placeholder (`en` + `vi`).
- MSW: a `canned_responses` read handler if not already present, so the picker + tests work offline.

## Architecture / approach

```
composer ──► useCannedResponseList() ──► picker → editor.commands.setContent(draftToHtml(body))
ai panel ──► useCannedResponseList() ──► cannedResponses: bodies → useSuggestReply(...)
```

- Reuse/lift the canned-response list query so both `ticket-composer.tsx` and `ai-suggestion-panel.tsx`
  can call it. If the existing query lives under `features/admin/canned-responses/`, expose a
  ticket-facing read query in `features/tickets/api/` (or import the admin query if the boundary
  allows) — respect `no-restricted-imports`; prefer a small tickets-side read hook hitting the same
  table (closed feature taxonomy — `code-standards.md`).
- Composer: add a picker button in the existing toolbar row (`ticket-composer.tsx:118-143`); insert
  selected body via Tiptap (`setContent`/`insertContent`).
- AI panel: build `cannedResponses` from the list and pass into the `suggestReply.mutate` call
  (`ai-suggestion-panel.tsx:40-47`).

## Related code files

**Create**

- `src/features/tickets/api/canned-response-queries.ts` — ticket-facing read hook (`canned.read`)
- `src/features/tickets/components/canned-response-picker.tsx` — composer picker

**Modify**

- `src/features/tickets/components/ticket-composer.tsx` — mount the picker, insert into editor
- `src/features/tickets/components/ai-suggestion-panel.tsx` — pass `cannedResponses`
- `src/mocks/handlers/rest-handlers.ts` — `canned_responses` read handler (if missing)
- i18n YAML `scripts/data/{en,vi}.yaml` — picker labels
- Tests: picker inserts body; AI call includes cannedResponses

## Implementation steps

1. Add a ticket-facing `canned-response-queries.ts` read hook (select id/title/body, ordered).
2. Build `canned-response-picker.tsx` (command/dropdown over titles); on select, insert the body
   into the composer editor.
3. Mount the picker in `ticket-composer.tsx`, gated on `hasPermission('canned.read')`.
4. In `ai-suggestion-panel.tsx`, fetch the list and pass bodies as `cannedResponses` to
   `useSuggestReply`.
5. MSW: ensure a `canned_responses` read handler + fixtures exist for offline demo/tests.
6. i18n keys in `en` + `vi`; run `lang:check`.
7. Tests: selecting a canned response inserts its body; the AI mutate payload includes
   `cannedResponses`.

## Todo

- [ ] `canned-response-queries.ts` read hook (`canned.read`-scoped)
- [ ] `canned-response-picker.tsx` composer picker (gated on `canned.read`)
- [ ] Composer mounts picker + inserts body into Tiptap
- [ ] AI panel passes `cannedResponses` to `useSuggestReply`
- [ ] MSW canned-responses read handler + fixtures
- [ ] i18n `en` + `vi` + `lang:check`
- [ ] Tests: picker insert + AI payload includes canned bodies

## Success criteria

An agent can pick a canned response from the composer and its body lands in the reply editor; the
AI "draft reply" now receives the canned-response library as context. Customers (no `canned.read`)
never see the picker. Works offline under MSW; covered by tests.

## Risks

| Risk                                                               | L×I | Mitigation                                                                         |
| ------------------------------------------------------------------ | --- | ---------------------------------------------------------------------------------- |
| Cross-feature import from admin canned-responses violates boundary | M×M | Add a small tickets-side read hook to the same table; don't deep-import admin      |
| Inserting body clobbers an in-progress draft in the editor         | M×M | Insert at cursor (`insertContent`) rather than `setContent`; or confirm-on-replace |
| HTML/format mismatch between stored body and Tiptap                | L×M | Reuse `draftToHtml` / treat body as plain text unless it's known-HTML              |
| Picker shown to customers                                          | L×L | Gate on `canned.read` (customers lack it)                                          |

## Security / RLS considerations

- Reads already gated by `canned.read` (`row_level_security.sql:181-183`); customers cannot fetch
  the library, so the picker naturally renders empty/hidden for them — still gate the UI to avoid a
  dead control.
- No writes here; the AI edge function already holds its key server-side (prior Phase 07 of the
  refactor plan) — passing canned bodies as context adds no secret exposure.

## Next steps

Final phase. After this, the seven help-desk gaps from the audit are closed.
</content>
