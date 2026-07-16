# ticket-management-web

[![CI](https://github.com/ndgkhoa/ticket-management-web/actions/workflows/ci.yml/badge.svg)](https://github.com/ndgkhoa/ticket-management-web/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ndgkhoa/ticket-management-web/branch/develop/graph/badge.svg)](https://codecov.io/gh/ndgkhoa/ticket-management-web)

A single-tenant help desk: customers open tickets, agents resolve them by team, and
admins manage roles and permissions.

> **Status: in progress.** The repo is being taken from an old React boilerplate to a
> production-shaped app in tracked phases. What exists today is the admin surface
> (users, roles, permissions) on a rebuilt foundation — React 19, TypeScript 6, Vite 8,
> Zod-validated env, type-safe i18n, and a tested CI pipeline. Ticket workflows, the
> Supabase data layer and the shadcn design system are the phases that follow. Plans
> live in [`plans/`](plans/), conventions in [`docs/code-standards.md`](docs/code-standards.md).

## Requirements

- **Bun** — package manager and script runner; CI runs every script through it
- **Node** `>=22.12` — the floor Vite 8 (Rolldown) needs. Node 24 is the Active LTS and
  what this is developed against; 22 is in maintenance and 26 does not reach LTS until
  October 2026.

## Getting started

```bash
git clone git@github.com:ndgkhoa/ticket-management-web.git
cd ticket-management-web
bun install

cp .env.example .env    # env is Zod-validated and fails fast at boot
bun run dev             # http://localhost:5173
```

The app has no backend yet. `VITE_API_MODE=msw` starts Mock Service Worker, which is
what will let the app run with no backend at all — the handler registry is still empty,
so today it registers the worker and passes requests through with a warning. Handlers
land with the data layer.

## Scripts

| Script               | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `bun run dev`        | Dev server on Vite's default port (5173)              |
| `bun run build`      | Typecheck, then production build to `dist/`           |
| `bun run preview`    | Serve the production build                            |
| `bun run lint`       | ESLint (import order, a11y, architectural boundaries) |
| `bun run test`       | Unit + component tests (Vitest)                       |
| `bun run test:watch` | Same, in watch mode                                   |
| `bun run test:cov`   | Tests with coverage; fails below the threshold        |
| `bun run e2e`        | End-to-end + accessibility tests (Playwright)         |
| `bun run e2e:ui`     | Playwright UI mode                                    |
| `bun run lang:gen`   | Generate locale bundles from `scripts/data/*.yaml`    |
| `bun run lang:check` | Fail if `en`/`vi` drift apart                         |

## Testing

| Layer            | Tool                                                                                                      | Runs on           |
| ---------------- | --------------------------------------------------------------------------------------------------------- | ----------------- |
| Unit + component | Vitest · Testing Library · jsdom                                                                          | every push and PR |
| Mock API         | MSW — one handler registry shared by tests and the demo build (registry empty until the data layer lands) | every push and PR |
| End-to-end       | Playwright, against the **production build**                                                              | PRs               |
| Accessibility    | axe-core via Playwright, WCAG 2.1 AA                                                                      | PRs               |

Two choices worth knowing about:

- **e2e runs against `vite build` output, not the dev server.** Vite 8 bundles with
  Rolldown for builds and a different pipeline for dev, so a bundler-only breakage is
  invisible to a dev-server test.
- **Accessibility is checked in a real browser, not jsdom.** axe cannot evaluate colour
  contrast without layout — in jsdom it reports `incomplete`, which the usual matcher
  ignores, so unreadable text passes silently. The first real violation found here was
  exactly that: antd's default primary button is 4.10:1, under the 4.5:1 AA needs.

The coverage threshold is a floor with headroom, not the current number. Coverage is a
ratio, so setting it at the measured value would fail CI whenever untested code is
_added_ — even with no regression at all. It is deliberately low while most of `src/` is
legacy screens awaiting replacement, and it rises as each phase lands code meant to stay.

## Architecture

```
src/
  app/          application shell — provider, app
  components/   shared UI (ui primitives, layouts, fallbacks)
  config/       values — Zod-validated env
  lib/          configured clients — axios, query-client
  utils/        pure helpers, zero app deps
  stores/       global client state (Zustand)
  features/     feature-based: api, components, pages, hooks, constants
  mocks/        MSW handlers, node server, browser worker
  testing/      test setup and the shared render helper
  i18n/         i18next + generated locale bundles
```

The dependency arrow only points one way: features may use `config/`, `lib/` and
`utils/`; none of the three may reach back. ESLint enforces it rather than a paragraph
asking nicely.

## License

Private, portfolio project.
