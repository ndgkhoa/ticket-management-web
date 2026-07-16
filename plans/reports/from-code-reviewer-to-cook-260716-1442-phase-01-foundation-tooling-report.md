# Phase 01 (Foundation & Tooling) — Retrospective Audit

Date: 2026-07-16 · Reviewer: code-reviewer · Branch `develop` · Range `a37dd6d..d588167`
Scope per brief. Out-of-scope (supabase, features/**, components/**, testing/CI) not reviewed.
Already-triaged items from `src-audit-vs-plan-coverage-260716-0058-report.md` (tables A/B/C) NOT re-reported.

**Bottom line:** the phase is solid. `tsc -b`, `lint` (0 err / 5 known warn), `build` all green;
env validation, type-safe i18n keys, locale sync, boundary rules and commit enforcement all
**genuinely work** — I broke each and watched it fail. The findings below are what the phase
either over-claims, mis-reports, or left as a latent gap the earlier audit missed. Nothing here
blocks later phases; several should be corrected so a later phase doesn't inherit a false premise.

Every CONFIRMED item was executed. All probe edits restored — my probe targets show 0 pending
changes; `tsc -b` re-verified green after restore.

---

## CONFIRMED findings (ranked)

### 1. [MEDIUM] Type-aware lint is OFF — contradicts the phase's own rationale for pinning TS 6

`eslint.config.js:26` extends `tseslint.configs.recommended` (the **non**-type-checked preset);
there is no `parserOptions.project` / `projectService` anywhere. So `no-floating-promises`,
`no-misused-promises`, `no-unsafe-*` etc. never run.

Probe (restored): added `async function _probe(){return 1} _probe()` to a `utils/` file →
`eslint` reported **no** floating-promise error → `TYPE-AWARE OFF`.

Why it matters: `phase-01` line 163 justifies capping TypeScript at 6 with _"Adopting TS 7 today
means the type-aware lint rules — a core CV signal of this repo — stop running."_ That protection
isn't running today either. The **cap is still correct** (typescript-eslint@8.64 peers
`typescript <6.1.0`, so TS7 breaks lint entirely) — but the stated reason is inflated. A later
phase reading this will assume promise-safety / unsafe-any lint is guarding them. It is not.
Fix: either enable `recommendedTypeChecked` + `projectService: true`, or correct the rationale to
"typescript-eslint won't install/run on TS7 (peer range)", which is the real, sufficient reason.

### 2. [LOW-MEDIUM] Phase mis-reports its own lockfile deliverable

`phase-01` Outcome (line 74) and Todo (line 212) both state _"No lockfile is tracked (`bun.lock`
is not committed) … Open → Phase 02 (CI)."_

Reality: `bun.lock` was committed in **`a37dd6d`** — the _first_ commit of this very phase.

```
git log --oneline a37dd6d~1..d588167 -- bun.lock   →  a37dd6d build(deps): upgrade to React 19…
git ls-files bun.lock                              →  bun.lock
```

CI _can_ install reproducibly today. The "open" item is stale. Risk: Phase 02 chases a
non-problem, or concludes reproducible installs are still blocked. Just close it.

### 3. [LOW] axios 401 handler wipes the i18next language preference

`lib/axios.ts:41` does `localStorage.clear()` on a 401. This phase made i18next the owner of the
language via the browser detector with `caches: ['localStorage']`, `lookupLocalStorage: 'language'`
(`i18n/index.ts:35-39`). So the 401 path now also deletes the `language` key → **session expiry
silently resets the user's language** to navigator/`en` on next load.
The earlier audit's table-B row only flags the `window.location.href` redirect for Phase 03; it
does not call out the language wipe. When Phase 03 rewrites this handler, replace the blanket
`localStorage.clear()` with `useAuthStore.getState().logout()` (clears only `auth-storage`).

### 4. [LOW] No generated-vs-source locale sync check (unlike seeds)

`lang:check` validates **YAML en/vi parity + plural categories only** (`check-locale-sync.ts` reads
`scripts/data/*.yaml`). Nothing verifies the committed `src/i18n/locales/**` TS bundles — the files
the app and typecheck actually consume — match their YAML source. The seed pipeline has exactly
this guard (`check-seed-sync.ts`); the locale pipeline does not.
Currently in sync (verified: ran `lang:gen`, `git status src/i18n/locales/` = clean, restored).
Failure mode: edit `en.yaml` + `vi.yaml` (lang:check passes) but forget `lang:gen` → stale bundles
ship; or hand-edit a generated file → undetected. Add a `check-locale-generated-sync` step mirroring
the seed check, ideally in the Phase-02 CI.

### 5. [LOW] `config/` boundary rule omits `~/stores/*`

`eslint.config.js:113-127` blocks `config/` from importing `~/lib/*`, `~/features/*`,
`~/components/*` — but **not** `~/stores/*`. The standards say config "holds values only." A config
file importing a stateful Zustand store would pass lint. (The `lib/` rule intentionally allows
`stores/` — `axios.ts` reads the token from the store — that part is fine.) Add `~/stores/*` to the
`config/` group. Probe confirmed the utils/ and lib/ groups _do_ fire, including on nested paths.

### 6. [LOW] Locale scripts disagree on dirname idiom

`generate-locales.ts:6-7` uses `__dirname`; `check-locale-sync.ts:39` uses `import.meta.dirname`.
Both resolve under `bun` (which shims `__dirname` in ESM), but the repo is `"type":"module"` and
`__dirname` would be `undefined` under plain Node ESM. Cosmetic while everything runs through `bun`;
normalise to `import.meta.dirname` for consistency.

---

## INFORMATIONAL

- **Auth tokens in `localStorage`.** `stores/auth.ts` persists `AccessToken`/`RefreshToken` via
  `zustand/persist` → readable by any XSS. Legacy .NET-era shape; Phase 03 replaces it with Supabase
  sessions (audit table B). Noting so the Supabase rewrite doesn't reintroduce token-in-localStorage.

---

## OBSERVATION — working-tree anomaly (NOT a Phase-01 code finding, NOT caused by my probes)

`src/styles/theme.ts` shows an **uncommitted** change that appeared mid-session:
`colorPrimary: '#0958d9'` → `'#cccccc'`. None of my commands touch this file (I only ever edited
`cn.ts`, `query-client.ts`, `dashboard.tsx`, `en.yaml`, `i18n/locales/`, each restored per-file; I
never ran `git checkout .`). It is external to this review — likely a parallel agent's WIP or an
injected edit. I deliberately **left it untouched** (do-not-edit constraint + not mine).
Flagging because if committed it regresses the WCAG contrast the file's own comment documents:
`#cccccc` on white ≈ 1.6:1 vs the intended 6.16:1 (blue-7). Do not commit it as-is.
(The other working-tree entry, `plans/.../phase-03-…md`, was already modified at session start.)

---

## Verified GOOD (broke each, watched it fail/pass correctly)

- **Versions match targets & installed:** React 19.2.7, TS 6.0.3, Vite 8.1.4 (genuinely Rolldown —
  `vite@8.1.4` deps `rolldown ~1.1.4`, bindings installed), Zod 4.4.3, react-query 5.101.2, zustand
  5.0.14, i18next 26.3.6, tailwind 4.3.2. Removals correct: `envalid`, `@types/react-router-dom`,
  `react-helmet-async`, `dayjs`, `immer`, `faker`(as dep) all gone. `keepPreviousData` fn adopted
  (`query-client.ts`). `@types/react` aligned to 19. ES2022 target/ES2023 lib aligned across both tsconfigs.
- **env.ts Zod 4 validation is real.** Isolated test: bad `VITE_API_MODE` → FAIL, bad
  `VITE_BASE_API_URL` → "Invalid URL", Vite builtins stripped, defaults applied. `z.url()` /
  `z.treeifyError()` behave. Imported at boot via `main.tsx` + `axios.ts`, so it fails fast.
- **Type-safe t() keys work.** Swapped `t('Dashboard.Welcome')`→`t('Dashboard.NonExistentKey')` →
  `tsc -b` errored TS2345 with the full union of valid keys. Restored.
- **lang:check catches desync.** Added a key to `en.yaml` only → exit 1,
  `[vi] missing key present in en: Validation.ProbeOnlyKey`. Restored.
- **Boundary rules fire.** `lib/` importing `~/features/*` → error; `utils/` importing `~/lib/*`
  (incl. nested `~/lib/nested/deep`) → error. Not vacuous.
- **Commit enforcement wired.** `core.hooksPath=.husky/_`, `.husky/pre-commit`→`bunx lint-staged`,
  `.husky/commit-msg`→`bunx commitlint`; bad message blocked, `feat: …` accepted. (`.husky/_/*`
  correctly gitignored + regenerated by `prepare` — husky v9 norm.)
- **docs/code-standards.md** is well-calibrated: explicit "enforced today vs target" split and an
  honest "**The CI rows report; they do not yet block** — `develop` has no branch protection." No
  false enforcement claims found there.
- `tsc -b`, `lint`, `build` all exit 0.

---

## Todo-vs-diff reconciliation (phase's highest-value question)

All `[x]` items verified present and functional EXCEPT the accuracy issues in findings 1 (type-aware
lint claim) and 2 (lockfile "open" item is actually done). The two remaining `[ ]` open items:
lockfile → **already resolved** (finding 2); `--max-warnings 0` / 5 exhaustive-deps warnings →
correctly still open (lint shows exactly those 5 warnings in the two antd tabs).

## Unresolved questions

1. `src/styles/theme.ts` uncommitted `#cccccc` change — whose is it, and should it be discarded
   before Phase 01 is considered closed? I did not touch it.
2. Finding 1: enable `recommendedTypeChecked` now, or downgrade the "type-aware lint is a core
   signal" claim to the real peer-dependency reason? (Enabling adds lint time + likely new errors
   in the legacy features/** that Phase 05 rewrites — may be why it was left off.)
3. Finding 4: does the generated-locale sync check belong here (retro-fix) or in Phase-02 CI
   alongside `check-seed-sync`?
