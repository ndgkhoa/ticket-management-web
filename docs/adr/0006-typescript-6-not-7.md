# ADR-0006: TypeScript 6 (Not 7) for Type-Aware Linting

**Date:** 2026-07-15 | **Status:** Accepted | **Priority:** P1

## Context

TypeScript 7 was released in late 2025, shipping performance improvements + refinements. Natural instinct: upgrade to the latest.

Problem: The project uses **typescript-eslint** for advanced linting (import order, unused variables, no-floating-promises, etc.). typescript-eslint v8 (the current version) requires TypeScript < 6.1.0 according to its peer dependencies.

```json
// typescript-eslint@8 package.json
"peerDependencies": {
  "typescript": ">= 4.9.5 < 6.1.0"
}
```

This means:

- TypeScript 7 is outside the supported range
- Using TS7 + typescript-eslint@8 together is unsupported (may work, may break silently)
- Waiting for typescript-eslint@9 to support TS7 means delaying deployment

## Decision

Pin **TypeScript 6.0.3** (LTS-equivalent) and wait for typescript-eslint to support TS7.

## Why Type-Aware Linting Matters More Than Latest TS

### Type-Aware Lint Rules

`typescript-eslint` enables rules that **require the TypeScript compiler**:

- `no-floating-promises`: catch forgotten `.catch()` on promises
- `no-misused-promises`: prevent passing promises where booleans are expected
- `await-thenable`: ensure you don't await non-Promises
- `no-unnecessary-condition`: flag impossible `if` branches

Without the TypeScript compiler, these rules can't run. ESLint alone (the plain version) sees JavaScript, not types.

### Example: The Bug That Needs Type Awareness

```typescript
async function fetchTickets() {
  // Bug: forgot await
  fetchTicketsFromApi(); // Should be: await fetchTicketsFromApi()

  return tickets; // undefined, oops
}
```

ESLint (plain) doesn't catch this. TypeScript compiler + typescript-eslint (`no-floating-promises`) does:

```
error: floating promise, add await
```

For a portfolio project that values correctness, losing type-aware lint is a step backward.

## Impact of Deferring TS7

| Change in TS7      | Impact on This Project                  |
| ------------------ | --------------------------------------- |
| Performance gains  | Nice but not blocking                   |
| Syntax refinements | Already using TS6 syntax (modern)       |
| Breaking changes   | None that affect React + Vite setup     |
| Library support    | Vite 8, React 19, Zod 4 all support TS6 |

Upgrading to TS7 gains performance (faster compilation), but loses type-aware linting. **The trade is not worth it.**

## Timeline to TS7 Support

`typescript-eslint@9`:

- Announced for Q4 2025
- Will support TypeScript 7 + 8

Action: Upgrade to TS7 + typescript-eslint@9 after release. For now, stay on TS6 to keep type-aware lint active.

## Implementation

```json
// package.json
{
  "devDependencies": {
    "typescript": "~6.0.3",
    "typescript-eslint": "^8.64.0"
  }
}
```

The `~` (tilde) pins to the 6.0.x range. Patch updates (6.0.4, etc.) are allowed; minor/major upgrades are blocked.

## CI Check

Add a safety check to prevent accidental TS7 sneaking in via dependency bumps:

```bash
# scripts/check-typescript-version.sh
TYPESCRIPT_VERSION=$(npm ls typescript | grep typescript@ | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
MAJOR=$(echo $TYPESCRIPT_VERSION | cut -d. -f1)

if [ "$MAJOR" -ne 6 ]; then
  echo "Error: TypeScript must be v6.x, got $TYPESCRIPT_VERSION"
  exit 1
fi
```

Run this in `pre-commit` to catch upgrades before they're committed.

## Trade-Offs

| Aspect                 | TypeScript 6              | TypeScript 7           |
| ---------------------- | ------------------------- | ---------------------- |
| **Type-aware linting** | ✅ Yes                    | ❌ No (until TS-ESL@9) |
| **Compilation speed**  | Good                      | Faster (~5–10%)        |
| **Syntax support**     | Modern (TS 4.9–6.0)       | Latest (TS 4.9–7.0)    |
| **Library ecosystem**  | Stable, wide support      | Emerging               |
| **Decision**           | **Chosen** (lint matters) | Not yet                |

The decision prioritizes **correctness at the type level** over marginal performance gains.

## Alternatives Considered

### Downgrade to TypeScript 5

- typescript-eslint@8 supports TS5
- But TypeScript 5 is older; why regress?
- TS6 is only 6 months old; worth keeping

### Use typescript-eslint@7 (older version)

- Works with TS5 + TS6
- But @7 is less performant and has fewer rules
- @8 is actively maintained; stay current on ESLint

### Wait for TypeScript to stabilize (TS 7.x patch releases)

- TS7 is already stable (released late 2025)
- No bugs blocking usage
- typescript-eslint@9 is the blocker, not TS7 itself
- No point waiting; proceed with TS6 now, upgrade later

## Future Upgrade Plan

When `typescript-eslint@9` is released:

1. Upgrade TypeScript to 7.0
2. Upgrade typescript-eslint to 9.0
3. Run CI; verify all lint rules still pass
4. Commit and ship

Expected time: Q4 2025.

## Related Decisions

- **ADR-0001** (TanStack Router): Type-safe routes rely on TypeScript compiler for validation
- Zod schemas are also validated at compile time; losing type-awareness would weaken that

## Rationale

This is a decision about **tools supporting development discipline**, not about language features. TypeScript 6 vs 7 is a minor version bump in the language; typescript-eslint support is the meaningful constraint. Staying with TS6 preserves the safety checks that make this a high-quality codebase.

---

**Brought to you by a recruiter reading your code and thinking: "This person understands that performance is good, but correctness is better."**
