# ADR-0007: semantic-release (Not release-please) for Automated Versioning

**Date:** 2026-07-19 | **Status:** Accepted | **Priority:** P2

## Context

The project already enforces **Conventional Commits** through commitlint (`feat:`, `fix:`, `refactor:`, …, and every commit now requires a scope). Those commit types carry enough information to derive the next version and a changelog automatically — doing it by hand is busywork that drifts.

Two mainstream tools turn conventional commits into releases:

- **semantic-release** — runs in CI on a push to the release branch, computes the version, writes the changelog, tags, and publishes, all in one pass.
- **release-please** (Google) — opens and maintains a long-lived "release PR" that accumulates changes; a human merges it to cut the release.

For a single-maintainer portfolio repo, the question is which flow adds the least ceremony while still producing a professional release history.

## Decision

Use **semantic-release**, triggered on push to `main` via `.github/workflows/release.yml`.

## Why semantic-release Fits This Repo

### One-pass release on merge, no extra PR to babysit

`develop` → PR → `main` is the only flow. release-please would add a _second_ standing PR that must be merged separately to actually release — an extra step whose only job is to gate a version bump that the commits already imply. semantic-release cuts the release the moment `main` moves, so merging the feature PR _is_ the release.

### The pipeline is declared, not scripted

`.releaserc.json` is the whole configuration:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/npm", { "npmPublish": false }],
    [
      "@semantic-release/git",
      {
        "assets": ["package.json", "CHANGELOG.md"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

- `commit-analyzer` → reads conventional commits, decides major/minor/patch.
- `release-notes-generator` + `changelog` → group commits into the `CHANGELOG.md` sections (Features / Bug Fixes) by scope.
- `npm` with `npmPublish: false` → bumps `package.json` version but does **not** publish (this is an app, not a library).
- `git` → commits `package.json` + `CHANGELOG.md` back to `main` as `chore(release): x.y.z [skip ci]`.
- `github` → creates the GitHub Release with the same notes.

### `[skip ci]` closes the loop

The release commit carries `[skip ci]`, so the write-back to `main` doesn't retrigger CI/Deploy in an infinite loop. That single token is what makes a self-committing release safe.

## Trade-Offs

| Aspect                 | semantic-release            | release-please               |
| ---------------------- | --------------------------- | ---------------------------- |
| **Release trigger**    | Automatic on push to `main` | Manual merge of release PR   |
| **Extra standing PR**  | ✅ None                     | ❌ One to maintain           |
| **Changelog**          | Generated + committed       | Generated in the release PR  |
| **Preview before cut** | ❌ Commits already imply it | ✅ Release PR is the preview |
| **Config surface**     | One `.releaserc.json`       | Manifest + config files      |
| **Best fit**           | Single-maintainer, CI-first | Multi-maintainer, PR-gated   |
| **Decision**           | **Chosen**                  | Not for this repo            |

The one thing release-please does better — a human-reviewable release PR — matters most on teams where the version bump needs sign-off. Here there is no second reviewer, so that "preview PR" is pure overhead.

## Alternatives Considered

### release-please

Solid tool, better on multi-maintainer repos where the release PR doubles as a staging area. Rejected only because its central feature (the standing release PR) is ceremony this repo doesn't need.

### Manual versioning + hand-written CHANGELOG

Full control, zero tooling. Rejected: it drifts the moment a release is rushed, and "forgot to update the changelog" is exactly the class of error automation removes. The commits already hold the truth.

### standard-version / conventional-changelog CLI

Generates the changelog but runs locally and still needs a human to tag/push/release. semantic-release folds all of that into CI with less glue.

## Related Decisions

- **Conventional Commits + commitlint** (see `code-standards.md`): the `scope-empty: never` rule guarantees every commit is releasable metadata, which is what makes the automated changelog group cleanly by scope.

## Rationale

The commit history is already a structured, machine-readable log of intent. semantic-release simply _reads_ it — version, changelog, tag, and release fall out of information that already exists, with no manual step to forget. For a repo optimized around a clean `develop → main` flow, that is the lowest-ceremony path to a release history that looks maintained rather than hand-patched.

---

**Brought to you by a recruiter reading your commits and thinking: "The versioning is a byproduct of disciplined commits — nothing here is done by hand that a machine can prove."**
