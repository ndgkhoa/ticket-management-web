# Phase 01 — Foundation & Tooling

**Priority:** P0 (blocks all) · **Status:** ⬜ todo

## Overview
Clean the base, fix dependency drift, upgrade React 18→19, and lock in tooling + conventions so every later phase inherits a consistent, enforced standard.

## Key insights (from current repo audit)
- `@types/react@19` with `react@18.3` → runtime/type mismatch (fix by upgrading React to 19).
- `@types/react-router-dom@5` is stale (RRD v7 ships own types) — removed in Phase 04 anyway; drop the bad types now.
- Dead code: commented dark-mode algorithm in `AppProviders.tsx`.
- Leaked backend PascalCase (`Id`, `AccessToken`) in `types/*`, `stores/auth.ts`.
- `envalid` in use — consolidate env validation to Zod (single validation lib).
- **The existing list UX is better than the "old boilerplate" framing suggests** — `use-query-params.ts` already puts `page`/`pageSize`/`keyword` in the URL, debounces writes, and resets `page: 1` on search (`search-keyword.tsx`). Phase 04 replaces the *mechanism* (typed search params), not the idea. Treat the current behavior as the spec to preserve, not as something to redesign.

### Bugs found in the audit — fix here, before the rewrite buries them
1. **`dayjs` is a phantom dependency.** It's imported by `user-list.tsx`, `role-list.tsx`, `permission-list.tsx` but is **not in `package.json`** — it only resolves because `antd` pulls it into `node_modules`. Phase 05 deletes antd and these three files break, with an error that reads like an antd problem. Fix now (declare it explicitly, or switch to `Intl.DateTimeFormat` and skip the dep — those files render dates only). Coordinated in Phase 05.
2. **Debounce is re-created every render.** `use-query-params.ts` builds `setQueryWithDebounce = debounce(...)` in the hook body — a new closure with its own timer per render, never memoized. It currently works *by accident*: `SearchKeyword` is uncontrolled (`defaultValue`), so keystrokes don't re-render it. Any parent re-render mid-typing splits the timer and fires `setQueryParams` twice. The replacement must hold the debounced fn in `useRef`/`useMemo` and cancel on unmount.
3. **`hideOnSinglePage: true`** in `user-list.tsx` — the pagination bar vanishes when results fit one page, so the layout jumps as the user filters. Banned by the List UX contract: disable controls, never hide them.
4. **Naming violations the kebab-case rule already forbids:** `create-user-model.tsx`, `create-role-model.tsx`, `create-permission-model.tsx` are **modals, not models** (typo ×3); `types/User.ts`, `types/Role.ts`, `types/Permission.ts` are PascalCase filenames. Also `user-list.tsx` hardcodes `description="Không có dữ liệu"`, breaking the no-hardcoded-strings rule in the one component the i18n rule most obviously applies to.

Lower priority, noted so it isn't rediscovered later: `use-create-user.ts` calls `queryClient.setMutationDefaults()` at **module scope** (side effect on import) while importing the singleton `queryClient` *and* calling `useQueryClient()`. It works, but it's fragile and hard to test. Phase 03 rewrites these hooks anyway — don't spend time here, just don't copy the pattern forward.

## Requirements
- React 19 + react-dom 19; align all `@types/*`.
- Zod-based env module (t3-env style) replacing envalid.

### Dependency versions — verified against the npm registry (2026-07-15)
Bump to latest **and** adopt the current API for each; a version bump without a usage check is how the old boilerplate rotted. Verify each against its own docs at implementation time — don't trust a snapshot, including this one.

| Package | Repo now | Target | Usage change that must land with the bump |
|---|---|---|---|
| typescript | 5.8.3 | **6.0.3** — *not 7.0.2* | See the TS 7 note below. TS 6 is the newest line `typescript-eslint` accepts. |
| typescript-eslint | 8.30 | 8.64.x | Peer range is `typescript >=4.8.4 <6.1.0` — this is what caps us at TS 6. |
| vite | 6.3.5 | **8.1.4** | Rolldown is the bundler: `build.rollupOptions` → **`rolldownOptions`**. Requires Node `^20.19 \|\| >=22.12`. `@vitejs/plugin-react-swc@4.3.1` already peers `vite ^8`. |
| zod | (new) | **4.4.3** | Zod 4 is the root import — no `zod/v4` subpath. Top-level formats: `z.email()`, `z.uuid()` (`z.string().email()` deprecated). Error API unified on `error`; `z.treeifyError()` replaces `.format()`. Custom issues via `ctx.addIssue()`. |
| @tanstack/react-query | 5.76 | 5.101.2 | `placeholderData: keepPreviousData` (imported fn) — the v4 `keepPreviousData: true` flag is gone. |
| @tanstack/react-router | (new) | 1.170.x | `validateSearch` takes the Zod 4 schema directly (Standard Schema). **Skip `@tanstack/zod-adapter`** — peers `zod@^3`. |
| @tanstack/react-table | (new) | 8.21.3 | Manual pagination/sorting + `rowCount` + `getRowId` (see Phase 05). |
| @tanstack/react-form | (new) | 1.33.x | v1 API — field API changed a lot vs the pre-1.0 tutorials most blog posts show. |
| @supabase/supabase-js | (new) | 2.110.x | `.range()` + `{ count: 'estimated' }` + `.textSearch()` (Phase 03 contract). |
| vitest | (new) | **4.1.10** | v4: `jsdom` must be an explicit dep; workspace config restructured (`projects`). |
| msw | (new) | 2.15.x | v2 `http`/`HttpResponse` API (not v1 `rest`/`res(ctx)`). |
| @tiptap/react | (new) | 3.27.x | v3 — extension/ SSR changes vs v2 docs. |
| recharts | (new) | 3.9.x | v3 breaking changes vs the v2 examples in circulation. |
| i18next / react-i18next | 25.3 / 15.6 | 26.x / latest | Check the v26 migration note before bumping. |
| tailwindcss | 4.1.6 | 4.3.2 | Minor; CSS-first config unchanged. |
| zustand | 5.0.4 | 5.0.14 | Patch. |
| react | 18.3.1 | 19.2.7 | The existing `@types/react@19` mismatch resolves here. |
| antd | 5.25 | **freeze** | Deleted in Phase 05 — do not spend a bump on it. |
| axios, envalid, use-query-params, react-router-dom, @types/react-router-dom, query-string | — | **removed** | Phases 01/03/04 retire them. |

**TypeScript 7 is deliberately deferred — this is the one "latest" we skip.** 7.0.2 is stable (the Go/native port), but `typescript-eslint@8.64` peers `typescript >=4.8.4 <6.1.0`, and there is no 9.x. Adopting TS 7 today means the type-aware lint rules — a core CV signal of this repo — stop running. **Target TS 6.0.3** (newest supported stable) and re-evaluate TS 7 when typescript-eslint ships support. Record this as a dated decision, not an oversight.
- ESLint flat config tightened (import order, a11y-ready), Prettier, `prettier-plugin-tailwindcss`.
- Husky + lint-staged (run eslint/prettier on staged) + commitlint (conventional commits).
- Dependabot config, `.github/PULL_REQUEST_TEMPLATE.md`, `CODEOWNERS`, issue templates.
- Establish `docs/code-standards.md` from plan's code-standards.
- **i18n modernization** (audited — current setup has real bugs):
  - Fix key divergence: `vi.Common.E`→`En`, add missing `en.Fields.Email` (typed resources will prevent recurrence).
  - Explicit init: `import '~/i18n'` in `main.tsx` before render (stop relying on transitive import via preferences store).
  - Fix reload desync: language restored in Zustand but `i18n.changeLanguage` never called on rehydrate — either add `onRehydrateStorage` to call it, OR switch to `i18next-browser-languagedetector` + drop the store `language` field (single source of truth). Prefer the detector.
  - Type-safe keys: `src/types/i18next.d.ts` augmenting `CustomTypeOptions` (`defaultNS` + `resources: typeof en`).
  - Replace manual plurals (`Role2`/`User2`/`Permission2`) with i18next `_one`/`_other` + `count`.
  - Feature namespaces (`common/auth/admin/tickets`); keep `lang:gen` YAML→TS DX + CI locale-sync check. Keep en + vi.

## Related code files
- Modify: `package.json`, `tsconfig*.json`, `eslint.config.js`, `src/config/env.ts` (envalid → Zod, **stays in `config/`** — env is a value, not a client wrapper).
- Create: `.github/dependabot.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS`, `.husky/*`, `commitlint.config.js`, `.lintstagedrc`.
- Rename (kebab-case sweep — the standard can't be enforced while the root files violate it): `src/AppProviders.tsx` → `src/app/provider.tsx`, `src/App.tsx` → `src/app/app.tsx`, `src/@types/i18next.d.ts` → `src/types/i18next.d.ts`, `create-{user,role,permission}-model.tsx` → `create-*-modal.tsx`. (`src/AppRoutes.tsx` dies in Phase 04 — don't rename it, delete it there. `features/*/types/*.ts` dies in Phase 03 — don't rename, delete.)
- Fix: `src/hooks/use-query-params.ts` (memoize the debounced setter + cancel on unmount) — it's deleted in Phase 04, but the fix documents the behavior the typed-search-param version must reproduce. `src/features/admin/users/components/user-list.tsx` (`hideOnSinglePage`, hardcoded VN empty-state string).
- Declare `dayjs` in `package.json` **or** replace the 3 usages with `Intl.DateTimeFormat` — see Phase 05 (antd removal is what makes this urgent).
- Delete: dead commented code; `@types/react-router-dom` (later), envalid.

## Implementation steps
1. Upgrade React/react-dom to 19; run typecheck, fix breaking type changes.
2. Bump deps per the version table; **for each bump, open the current docs and fix the usage** — don't just move the number. Order: TS 6 + typescript-eslint (lint must stay green) → Vite 8 (`rolldownOptions`, Node version) → the rest. Freeze antd.
   - Re-run `npm view <pkg> version` at implementation time; the table is a 2026-07-15 snapshot.
3. Replace envalid with Zod env schema in `src/config/env.ts`; typed `env` export; fail-fast on missing vars.
4. **Establish the directory skeleton + naming sweep** before any feature work lands on top of the old shape: create `src/app/` (provider/app), reconcile `config/` vs `lib/` vs `utils/` per the boundary rules, fold `@types/` into `types/`, rename the PascalCase root files. Later phases assume this layout exists.
5. Tighten ESLint flat config; add import-order + consistent-type-imports rules. Add `no-restricted-imports` to enforce the boundaries mechanically: block deep cross-feature imports (`features/*/!(index)`) and block `utils/` importing from `lib/`/`features/`. A convention nobody can violate beats one in a doc.
6. Set up husky pre-commit (lint-staged) + commit-msg (commitlint).
7. Add Dependabot, PR template, CODEOWNERS, issue templates.
8. Remove dead code. (Domain-field renames — `Id`→`id` etc. — land with the Phase 03 data models, not here.)
9. Seed `docs/code-standards.md`.

## Todo
- [ ] React 19 upgrade + typecheck green
- [ ] TypeScript 6.0.3 + typescript-eslint 8.64 (TS 7 deferred — lint support blocker, documented)
- [ ] Vite 8 (`rolldownOptions`, Node ≥20.19) + build green
- [ ] Remaining deps bumped, **usage updated per current docs** (not just version numbers)
- [ ] Zod env module in `config/env.ts`
- [ ] Directory skeleton + kebab-case sweep (`app/provider.tsx`, `types/`, `create-*-modal.tsx`, config/lib/utils boundaries)
- [ ] Audit bugs fixed: phantom `dayjs` declared/removed, debounce memoized, `hideOnSinglePage` gone, VN string localized
- [ ] ESLint/Prettier/commitlint/lint-staged/husky + `no-restricted-imports` boundary rules
- [ ] Dependabot + GitHub templates
- [ ] Dead code removed, docs/code-standards seeded

## Success criteria
`bun run build` + typecheck + lint all pass on React 19 + TS 6 + Vite 8; commits blocked unless conventional; env validated at boot.

## Risks
- React 19 breaking changes in deps (antd/react-helmet) — pin/patch or defer antd removal to Phase 05.
- **Vite 8 = Rolldown.** A bundler swap can surface plugin incompatibilities that only appear in a production build — build *and* preview before calling it done, don't trust `dev`.
- Chasing "latest" indiscriminately (TS 7) trades a working lint pipeline for a version number. Ecosystem support gates the bump, not the release date.
