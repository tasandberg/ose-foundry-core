# Types package: fork-resident build automation

**Date:** 2026-06-13
**Status:** Design approved, pending implementation
**Branch context:** `feat/types-package-slim`

## Problem

`@ose-foundry-core/types` is a declaration-only companion package built from the
OSE system source (see `[[types-package-design]]` in memory). It currently ships
to consumers via an orphan `types-dist` branch that is **rebuilt by hand** —
copy the three built files, stamp the version, force-push.

The work lives in an open PR against upstream (`NecroticGnome/ose-foundry-core`).
That PR may never merge. We want the types package to keep working off the fork
indefinitely: a permanent branch that periodically picks up upstream changes and
republishes the built declarations, installable straight from GitHub.

## Why a rebase is even needed (and where conflicts live)

The types work is **not purely additive**. Against `upstream/main` it is one
commit touching ~20 files:

- **7 new files** (never conflict): `src/types/index.ts`, `src/types/classes.ts`,
  `tsconfig.types.json`, `rollup.types.config.js`, `packages/types/*`,
  `.github/workflows/ci.yml`.
- **~13 edited shared files** (the conflict surface): `src/module/config.ts`,
  `src/module/actor/data-model-classes/*`, `src/module/classes/*`,
  `package.json`, `package-lock.json`, the two release workflows.

The shared-file edits are cosmetic-but-not-additive: adding `export` to
interfaces, JSDoc, `readonly`, a couple of `as` casts — **no logic changes**.
But they sit in files upstream actively maintains (the most recent upstream
commit, the #158 spell-slot fix, edited `data-model-character-spells.ts`, one of
the touched files). So rebasing the carried diff onto a newer upstream **can**
conflict, and the conflicts will be shallow and JSDoc-adjacent.

Consequence: we cannot build straight off `upstream/main` (it doesn't `export`
these interfaces or have `src/types/`). We must carry the source diff on a
branch and rebase it.

**Key design principle:** conflicts are only possible during `git rebase`, which
is inherently a human action. The build itself is 100% mechanical and never
conflicts. So the rebase stays a local manual step; CI only ever builds. A CI job
that rebased-and-force-pushed would dump conflicts where no human can resolve
them — explicitly rejected.

## Architecture

```
upstream/main (NecroticGnome)
        │  (you manually rebase onto this, occasionally — local only)
        ▼
types-source        ← permanent branch on the fork; carries the ~20-file diff
        │             build artifacts gitignored
        │  workflow_dispatch → npm run build:types
        ▼
types               ← orphan dist branch; 3 built files; version 0.0.0-dev.<sha>
        │
        ▼
consumers: pnpm/npm add -D github:tasandberg/ose-foundry-core#types
```

### Branches (all on `origin` = `tasandberg/ose-foundry-core`)

| Branch | Role | Lifecycle |
|---|---|---|
| `feat/types-package-slim` | Frozen PR snapshot | Stays for the open upstream PR; automation never touches it |
| `types-source` | Permanent home of the types diff | Rebased onto `upstream/main` **locally**, pushed `--force-with-lease` |
| `types` | Orphan dist branch, 3 built files | Rewritten by the workflow; consumers install from here |

The existing `types-dist` branch is superseded by `types` and may be deleted once
`types` is live.

## Components

### 1. Create `types-source`

Branched from the current tip of `feat/types-package-slim` (identical commit).
From then on it is the source of truth; the PR branch is a frozen snapshot.

### 2. Local sync helper — `tools/sync-upstream.js` (`npm run sync:upstream`)

Sits alongside the existing `tools/symlink.js`. Steps:

1. Ensure an `upstream` remote pointing at
   `https://github.com/NecroticGnome/ose-foundry-core.git` (add if missing;
   leave alone if already correct).
2. `git fetch upstream`.
3. `git checkout types-source`.
4. `git rebase upstream/main`.
5. On a clean rebase: print the push reminder
   `git push --force-with-lease origin types-source`.
   On conflict: stop and let the user resolve locally (do **not** auto-abort or
   auto-continue).

This is the **only** place a rebase happens. Conflicts never reach CI.

### 3. Workflow — `.github/workflows/build-types-dist.yml`

Trigger: `workflow_dispatch` only (no schedule). Permissions: `contents: write`.

1. Checkout `types-source` with full history (`fetch-depth: 0`).
2. Setup Node 22, `npm ci`.
3. `npm run build:types` → produces `packages/types/index.d.ts`.
4. `SHA=$(git rev-parse --short HEAD)`.
5. Assemble the dist tree fresh on an orphan branch: the three files —
   `index.d.ts` (built), `README.md` and `package.json` (from `packages/types/`).
   Stamp `version = 0.0.0-dev.<SHA>` in the copied `package.json`.
6. Commit `Build @ose-foundry-core/types from <SHA>`.
7. Force-push to `origin types`.

Single-commit orphan per run (matches the current `types-dist` state — no
accumulated history). Authenticated with the workflow `GITHUB_TOKEN`; force-push
within the same repo needs no extra secret.

This replaces the manual copy-and-force-push entirely.

### Consumer install (cleaner than before)

```
pnpm add -D github:tasandberg/ose-foundry-core#types
# or
npm  add -D github:tasandberg/ose-foundry-core#types
```

The pinned League beta peer dep auto-installs (per `[[types-package-design]]`).

## Out of scope (deliberate)

- **No npm publish** — the `@ose-foundry-core` scope belongs to upstream, not us;
  publishing under it is a land-grab and creates a zombie package the day
  upstream publishes the real one. Install-from-GitHub is the low-commitment,
  reversible fit for a fork stopgap.
- **No scheduled cron** — manual `workflow_dispatch` only; you decide when to
  refresh.
- **No auto-rebase in CI** — rebase is local-only (see design principle above).
- **No change** to the existing `release.yml` / `pre-release.yml` npm-publish
  plumbing — it stays dormant behind the absent `NPM_TOKEN` secret.

## Operating procedure (steady state)

1. `npm run sync:upstream` — rebases `types-source` onto latest upstream; resolve
   any (shallow) conflicts locally.
2. `git push --force-with-lease origin types-source`.
3. Trigger the `build-types-dist` workflow (Actions tab → Run workflow).
4. The `types` branch updates; consumers pick it up on their next install.
