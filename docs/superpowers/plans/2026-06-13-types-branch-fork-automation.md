# Types Branch Fork Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a consumer-installable `types` branch on the fork, fed by a permanent `types-source` branch and a manual-dispatch build workflow, so `@ose-foundry-core/types` keeps shipping even if the upstream PR never merges.

**Architecture:** A permanent `types-source` branch carries the ~20-file types diff and is rebased onto `upstream/main` **locally** (the only place conflicts can occur). A `workflow_dispatch` GitHub Action builds the declarations from that branch's tip and force-pushes a 3-file orphan `types` branch. Consumers install `github:tasandberg/ose-foundry-core#types`. No npm publish, no cron, no auto-rebase.

**Tech Stack:** Node 22, npm, `tsc` + `rollup-plugin-dts` (`npm run build:types`), GitHub Actions, a CommonJS Node helper (`tools/sync-upstream.js`) matching the existing `tools/symlink.js` style.

**Design reference:** `docs/superpowers/specs/2026-06-13-types-dist-fork-automation-design.md`

> **Push/dispatch steps require Tim's credentials.** Tasks 1, 6 (and the final push reminders) push to `origin` or trigger the workflow. A write-blocked agent should prepare everything and hand these specific steps to Tim. Every other task is local-only.

> **HARD GUARDRAILS — do not violate:**
> - **Never touch the upstream PR or upstream code.** The PR branch `feat/types-package-slim` is FROZEN. No commits, no pushes to it. All implementation commits (Tasks 2–4) land on `types-source`.
> - **Never push to upstream** (`NecroticGnome/ose-foundry-core`). The `upstream` remote added by the sync helper is **fetch-only in practice** — we only ever `git fetch` it and rebase locally. Every push in this plan targets `origin` (Tim's fork).
> - The build workflow runs in the fork and pushes only the fork's `types` branch.

---

## File Structure

- **Create** `tools/sync-upstream.js` — local rebase helper; ensures the `upstream` remote, fetches, rebases `types-source` onto `upstream/main`. Sole owner of the rebase step.
- **Create** `.github/workflows/build-types-dist.yml` — `workflow_dispatch` build; produces and force-pushes the `types` branch.
- **Modify** `package.json` — add the `sync:upstream` script.
- **Modify** `packages/types/README.md` — Install section → GitHub-install form (this README ships on the `types` branch).
- **Branches** — create permanent `types-source`; first build creates orphan `types`; retire `types-dist`.

---

## Task 1: Create the permanent `types-source` branch

**Files:** none (git branch only). **Run by Tim** (needs push).

- [ ] **Step 1: Confirm the source tip is what we expect**

Run: `git rev-parse --short feat/types-package-slim`
Expected: a short sha (e.g. `7a5e93d` or later) — the branch holding the types diff.

- [ ] **Step 2: Create `types-source` from it and switch to it**

```bash
git checkout -b types-source feat/types-package-slim
```
All subsequent implementation commits (Tasks 2–4) land here, never on the frozen
PR branch `feat/types-package-slim`.

- [ ] **Step 3: Push it to the fork**

```bash
git push -u origin types-source
```
Expected: `* [new branch] types-source -> types-source`.

- [ ] **Step 4: Verify it exists on origin (and the PR branch is untouched)**

Run: `git ls-remote --heads origin types-source`
Expected: one line with a sha and `refs/heads/types-source`.
Run: `git rev-parse feat/types-package-slim` — note this sha stays unchanged for
the rest of the plan.

---

## Task 2: Add the `tools/sync-upstream.js` rebase helper

**Files:**
- Create: `tools/sync-upstream.js`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Write the helper**

Create `tools/sync-upstream.js`:

```js
/**
 * @file Rebases the permanent `types-source` branch onto the latest upstream
 * `main`, so the @ose-foundry-core/types package can be rebuilt from current
 * system source. Run via `npm run sync:upstream`.
 *
 * This is the ONLY place a rebase happens. The build workflow never rebases —
 * it only builds the tip of `types-source`. Conflicts are therefore always
 * resolved here, locally, by a human.
 */
const { execSync } = require("child_process");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const UPSTREAM_URL = "https://github.com/NecroticGnome/ose-foundry-core.git";
const UPSTREAM_REMOTE = "upstream";
const SOURCE_BRANCH = "types-source";

const argv = yargs(hideBin(process.argv))
  .option("dry-run", {
    type: "boolean",
    default: false,
    describe: "Fetch upstream and report incoming commits without rebasing.",
  })
  .parseSync();

function run(cmd) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8" }).trim();
}

function ensureUpstreamRemote() {
  const remotes = run("git remote").split("\n");
  if (remotes.includes(UPSTREAM_REMOTE)) {
    const url = run(`git remote get-url ${UPSTREAM_REMOTE}`);
    if (url !== UPSTREAM_URL) {
      run(`git remote set-url ${UPSTREAM_REMOTE} ${UPSTREAM_URL}`);
      console.log(`Updated ${UPSTREAM_REMOTE} -> ${UPSTREAM_URL}`);
    }
  } else {
    run(`git remote add ${UPSTREAM_REMOTE} ${UPSTREAM_URL}`);
    console.log(`Added remote ${UPSTREAM_REMOTE} -> ${UPSTREAM_URL}`);
  }
}

function main() {
  ensureUpstreamRemote();

  console.log(`Fetching ${UPSTREAM_REMOTE}...`);
  execSync(`git fetch ${UPSTREAM_REMOTE}`, { stdio: "inherit" });

  const incoming = run(
    `git log --oneline ${SOURCE_BRANCH}..${UPSTREAM_REMOTE}/main`
  );

  if (!incoming) {
    console.log(
      `\n${SOURCE_BRANCH} is already up to date with ${UPSTREAM_REMOTE}/main. Nothing to do.`
    );
    return;
  }

  console.log(`\nIncoming upstream commits not yet in ${SOURCE_BRANCH}:`);
  console.log(incoming);

  if (argv.dryRun) {
    console.log("\n--dry-run: stopping before rebase.");
    return;
  }

  console.log(
    `\nChecking out ${SOURCE_BRANCH} and rebasing onto ${UPSTREAM_REMOTE}/main...`
  );
  execSync(`git checkout ${SOURCE_BRANCH}`, { stdio: "inherit" });
  try {
    execSync(`git rebase ${UPSTREAM_REMOTE}/main`, { stdio: "inherit" });
  } catch {
    console.error(
      "\nRebase hit conflicts. Resolve them, then `git rebase --continue`.\n" +
        "When the rebase finishes, push with:\n" +
        `  git push --force-with-lease origin ${SOURCE_BRANCH}`
    );
    process.exit(1);
  }

  console.log(
    `\nRebase clean. Push with:\n  git push --force-with-lease origin ${SOURCE_BRANCH}`
  );
}

main();
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add to `"scripts"` (next to `"link"`/`"unlink"`):

```json
"sync:upstream": "node ./tools/sync-upstream.js",
```

- [ ] **Step 3: Verify dependencies are present**

`yargs` and `child_process` are already used by `tools/symlink.js` / Node core.
Run: `node -e "require('yargs'); console.log('yargs ok')"`
Expected: `yargs ok`.

- [ ] **Step 4: Dry-run the helper (no mutation)**

Requires `types-source` to exist locally (Task 1). Run:
`npm run sync:upstream -- --dry-run`
Expected: adds/confirms the `upstream` remote, fetches, then either
`types-source is already up to date with upstream/main. Nothing to do.` **or** a
list of incoming commits followed by `--dry-run: stopping before rebase.` No
branch checkout, no rebase, working tree unchanged (`git status` clean).

- [ ] **Step 5: Commit**

```bash
git add tools/sync-upstream.js package.json
git commit -m "feat(types): add sync:upstream rebase helper"
```

---

## Task 3: Point the package README install at the `types` branch

**Files:**
- Modify: `packages/types/README.md:15-20`

The README ships on the `types` branch, so its Install section must show how to
install from GitHub (the package is not published to npm).

- [ ] **Step 1: Replace the Install code block**

Replace lines 17-20 (the ```sh block showing `npm i -D @ose-foundry-core/types`)
with:

````md
```sh
npm  add -D github:tasandberg/ose-foundry-core#types
# or
pnpm add -D github:tasandberg/ose-foundry-core#types
```

This installs the prebuilt declarations directly from the fork's `types` branch.
The branch always points at the latest build; re-run the command to pick up
updates.
````

- [ ] **Step 2: Verify the edit**

Run: `grep -n "github:tasandberg" packages/types/README.md`
Expected: two lines (npm and pnpm) referencing `#types`.

- [ ] **Step 3: Commit**

```bash
git add packages/types/README.md
git commit -m "docs(types): install from #types branch instead of npm"
```

---

## Task 4: Add the build-and-publish workflow

**Files:**
- Create: `.github/workflows/build-types-dist.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/build-types-dist.yml`:

```yaml
# Manually-triggered build of the @ose-foundry-core/types declarations.
# Builds from the tip of `types-source` and force-pushes a 3-file orphan
# `types` branch that consumers install via:
#   npm add -D github:tasandberg/ose-foundry-core#types
#
# This workflow NEVER rebases. Rebasing types-source onto upstream is a local,
# manual step (npm run sync:upstream). Run this only after types-source is
# pushed and you are ready to publish.
name: Build types dist

on:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout types-source
        uses: actions/checkout@v4
        with:
          ref: types-source
          fetch-depth: 0

      - name: Setup Node.js version 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build type declarations
        run: npm run build:types

      - name: Assemble and publish the types branch
        run: |
          set -euo pipefail
          SHA=$(git rev-parse --short HEAD)

          # Stage the three shipped files in a temp dir before rewriting the tree.
          DIST=$(mktemp -d)
          cp packages/types/index.d.ts "$DIST/index.d.ts"
          cp packages/types/README.md  "$DIST/README.md"
          cp packages/types/package.json "$DIST/package.json"
          ( cd "$DIST" && npm pkg set version="0.0.0-dev.$SHA" )

          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          # Build a clean single-commit orphan and force it onto `types`.
          git checkout --orphan types-publish
          git rm -rf . >/dev/null 2>&1 || true
          cp "$DIST/index.d.ts"   index.d.ts
          cp "$DIST/README.md"    README.md
          cp "$DIST/package.json" package.json
          git add index.d.ts README.md package.json
          git commit -m "Build @ose-foundry-core/types from $SHA"
          git push --force origin types-publish:types
```

- [ ] **Step 2: Validate the YAML parses**

Run: `node -e "const y=require('js-yaml'); y.load(require('fs').readFileSync('.github/workflows/build-types-dist.yml','utf8')); console.log('yaml ok')"`
Expected: `yaml ok`.
(If `js-yaml` is not installed, instead run `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/build-types-dist.yml')); print('yaml ok')"`.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build-types-dist.yml
git commit -m "ci(types): add manual build-types-dist workflow"
```

---

## Task 5: Locally dry-run the dist assembly (no push)

**Files:** none (verification only). Proves the workflow's build+assemble logic
produces exactly 3 files with a stamped version, before trusting CI.

- [ ] **Step 1: Build the declarations**

Run: `npm run build:types`
Expected: completes; `packages/types/index.d.ts` exists.
Run: `test -f packages/types/index.d.ts && echo "built"`
Expected: `built`.

- [ ] **Step 2: Reproduce the assembly into a temp dir**

```bash
SHA=$(git rev-parse --short HEAD)
DIST=$(mktemp -d)
cp packages/types/index.d.ts "$DIST/index.d.ts"
cp packages/types/README.md  "$DIST/README.md"
cp packages/types/package.json "$DIST/package.json"
( cd "$DIST" && npm pkg set version="0.0.0-dev.$SHA" )
ls -1 "$DIST"
node -e "console.log('version:', require(process.env.DIST + '/package.json').version)" DIST="$DIST" || node -e "console.log('version:', require('$DIST/package.json').version)"
```
Expected: `ls` shows exactly `README.md`, `index.d.ts`, `package.json`; printed
version is `0.0.0-dev.<sha>` matching `$SHA`.

- [ ] **Step 3: Clean up the build artifact (gitignored, but tidy)**

Run: `npm run clean`
Expected: removes `.types-build`; `packages/types/index.d.ts` is gitignored so
`git status` stays clean.

No commit (verification only).

---

## Task 6: First publish and retire `types-dist`

**Files:** none (workflow run + git branch ops). **Run by Tim** (dispatch + push).
Prerequisite: Tasks 2–4 are committed on `types-source` and pushed to `origin`
(the workflow checks out `types-source`, so the workflow file + sync helper +
README must be on that branch).

- [ ] **Step 1: Push `types-source` (carrying Tasks 2–4 commits) to origin**

```bash
git push origin types-source
```
Do **not** push `feat/types-package-slim`. The workflow dispatches against and
checks out `types-source` regardless of which ref you click.

- [ ] **Step 2: Trigger the build**

GitHub → Actions → **Build types dist** → **Run workflow** (leave the default
ref). Wait for a green run.

- [ ] **Step 3: Verify the `types` branch contents**

```bash
git fetch origin
git ls-tree --name-only origin/types
```
Expected exactly: `README.md`, `index.d.ts`, `package.json`.

- [ ] **Step 4: Verify the stamped version**

```bash
git show origin/types:package.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('version:', JSON.parse(s).version))"
```
Expected: `version: 0.0.0-dev.<sha>` where `<sha>` matches `git rev-parse --short origin/types-source`.

- [ ] **Step 5: Smoke-test a consumer install**

```bash
cd "$(mktemp -d)" && npm init -y >/dev/null
npm add -D github:tasandberg/ose-foundry-core#types
test -f node_modules/@ose-foundry-core/types/index.d.ts && echo "installed ok"
```
Expected: `installed ok` (the pinned League beta peer auto-installs on npm 7+).

- [ ] **Step 6: Retire the old `types-dist` branch**

```bash
git push origin --delete types-dist
```
Expected: `- [deleted] types-dist`. (Confirm no consumer still pins `#types-dist`
first.)

---

## Task 7: Update project memory

**Files:**
- Modify: `/Users/tim/.claude/projects/-Users-tim-dev-foundry-dev-ose-foundry-core/memory/types-package-design.md`

- [ ] **Step 1: Record the new distribution model**

Update the "Install branch for consumers" bullet to reflect: permanent
`types-source` branch (rebased locally via `npm run sync:upstream`), the
`build-types-dist` `workflow_dispatch` action that force-pushes the orphan
`types` branch, consumer install `github:tasandberg/ose-foundry-core#types`, and
that `types-dist` is retired. Keep the existing `[[build-env-foundry-types]]`
link.

- [ ] **Step 2: No commit** (memory dir is outside the repo).

---

## Operating procedure (steady state, post-implementation)

1. `npm run sync:upstream` — rebase `types-source` onto latest upstream; resolve any (shallow) conflicts locally.
2. `git push --force-with-lease origin types-source`.
3. Actions → **Build types dist** → Run workflow.
4. The `types` branch updates; consumers pick it up on their next install.
