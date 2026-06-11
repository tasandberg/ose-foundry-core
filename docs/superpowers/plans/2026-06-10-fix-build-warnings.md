# Fix `npm run build` Warnings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `npm run build` output from 782 TypeScript warnings + 11 sass deprecation warnings to only the ~60 warnings that require the (separately planned) fvtt-types v13 document-wiring work.

**Architecture:** All fixes are warning-hygiene changes on a new branch `fix/build-warnings`, stacked on `feat/types-package-slim` (the audit baseline, commit `5972d92`). The Quench e2e test files are part of the production bundle (`src/ose.js:35` imports `./e2e`, which statically imports every `*.test.ts`), so they CANNOT be excluded from the rollup tsconfig — TypeScript type-checks every transitively imported file regardless of `exclude`. Instead, test files get `// @ts-nocheck` headers (they were written against fvtt-types v12; the directive is removed per-file as v13 wiring lands). Production-source warnings are fixed properly.

**Tech Stack:** TypeScript 5 + @rollup/plugin-typescript, Dart Sass, fvtt-types v13 (pinned commit `d7751f2`), Biome.

**Baseline (verified 2026-06-10 on `5972d92`):** Build exits 0. `npm run build 2>&1 | grep -c "plugin typescript"` → **782**. Sass prints 5 deprecation warnings + "6 repetitive deprecation warnings omitted". 706 of 782 TS warnings come from `src/**/__tests__/**` and `src/e2e/**`.

**Out of scope (next plan, do NOT attempt here):**
- `DataModelConfig` / `DocumentClassConfig` declaration-merging wiring for `OseActor`/`OseItem`/`OSECombat`/`OSECombatant`. This is the root cause of the ~60 residual warnings (`Property 'getFlag' does not exist on type 'OSECombatant'`, `'combatants' does not exist on 'OSECombat'`, `TS7006` implicit-any callbacks in `combat.ts:280` and `helpers-chat.ts:45,49` — those callbacks infer correctly once collections are typed, so do not hand-annotate them now).
- **Warning:** do NOT "fix" `this.defeated` → `this.isDefeated` in `src/module/combat/combatant.ts:23-25` despite the TS2551 suggestion. `defeated` is the v13 Combatant schema field (invisible until wiring lands); renaming it would make the `isDefeated` getter infinitely recursive.
- Stripping Quench tests from the production bundle (they currently ship in `dist/ose.js`). Worth a future discussion; requires dev/prod build split or dynamic import + code-splitting.

---

### Task 0: Worktree, branch, baseline

**Files:** none modified.

- [ ] **Step 1: Create worktree + branch off the audit baseline**

```bash
cd /Users/tim/dev/foundry-dev/ose-foundry-core
git worktree add ~/.config/superpowers/worktrees/ose-foundry-core/fix-build-warnings \
  -b fix/build-warnings feat/types-package-slim
cd ~/.config/superpowers/worktrees/ose-foundry-core/fix-build-warnings
npm ci
```

(An audit worktree already exists at `~/.config/superpowers/worktrees/ose-foundry-core/build-warnings-audit` on branch `audit/build-warnings`; leave it alone or reuse it by branching from it — either is fine as long as work lands on `fix/build-warnings`.)

- [ ] **Step 2: Capture baseline**

```bash
npm run build 2>&1 | tee /tmp/build-baseline.log | grep -c "plugin typescript"
```

Expected: `782` (small drift acceptable; record the actual number — every later task verifies against it).

---

### Task 1: `// @ts-nocheck` the Quench test files (≈706 warnings)

The test files are bundled (see Architecture), so this is the only per-file mute TypeScript offers. Each header carries a removal note tied to the wiring work.

**Files:**
- Modify: every `*.test.ts` under `src/**/__tests__/` (27 files, e.g. `src/module/actor/__tests__/entity-actor.test.ts`, `src/module/combat/__tests__/combat.test.ts`)

- [ ] **Step 1: Add the directive to line 1 of every test file**

```bash
find src -path "*__tests__*" -name "*.test.ts" -print0 | xargs -0 -I{} sed -i '' \
  '1s|^|// @ts-nocheck — Quench e2e tests written against fvtt-types v12; remove once v13 DataModelConfig/DocumentClassConfig wiring lands\n|' {}
git diff --stat | tail -1
```

Expected: `27 files changed, 27 insertions(+)`.

- [ ] **Step 2: Verify warning count collapses**

```bash
npm run build 2>&1 | tee /tmp/build-task1.log | grep -c "plugin typescript"
```

Expected: **~85** (782 minus the ~706 test-file warnings; `src/e2e/testUtils.ts` and `src/e2e/index.ts` are not `.test.ts` files and still warn — fixed in Tasks 2-3). Build must still exit 0 and emit `dist/ose.js`.

- [ ] **Step 3: Lint must stay clean on the touched files**

```bash
npm run lint
```

Expected: PASS (Biome has no rule against `@ts-nocheck`; if it flags, add `// biome-ignore` per its suggestion rather than removing the directive).

- [ ] **Step 4: Commit**

```bash
git add -A src
git commit -m "chore(build): ts-nocheck v12-era Quench test files pending v13 type wiring"
```

---

### Task 2: Augment missing Foundry globals in `src/global.d.ts`

The pinned fvtt-types commit declares `String.prototype.capitalize`, `Number.isNumeric`, and `CombatRoundEventContext`, but none are reachable from the package's main entry. The file already does exactly this workaround for `Math.clamp` — extend the same block.

**Files:**
- Modify: `src/global.d.ts` (inside the existing `declare global { ... }` block, directly below the `interface Math { clamp... }` workaround)

- [ ] **Step 1: Add the augmentations**

Insert after the closing brace of `interface Math { ... }`:

```ts
  // Same issue as Math.clamp above: Foundry extends these primitives
  // (client primitives module), but the League v13 types don't re-export
  // them via the main entry.
  interface String {
    capitalize(): string;
  }

  interface NumberConstructor {
    isNumeric(n: unknown): boolean;
  }

  // Passed by Foundry v13 to Combat#_onEndRound and friends; not exported
  // via the fvtt-types main entry.
  interface CombatRoundEventContext {
    round: number;
    turn: number | null;
    skipped: boolean;
  }
```

- [ ] **Step 2: Verify the three warning families are gone**

```bash
npm run build 2>&1 | tee /tmp/build-task2.log >/dev/null
grep -c "TS2339.*capitalize" /tmp/build-task2.log; grep -c "isNumeric" /tmp/build-task2.log; grep -c "CombatRoundEventContext" /tmp/build-task2.log
```

Expected: `0`, `0`, `0` (grep -c prints 0 and exits 1 — that's the pass condition).

- [ ] **Step 3: Commit**

```bash
git add src/global.d.ts
git commit -m "fix(types): augment String.capitalize, Number.isNumeric, CombatRoundEventContext globals"
```

---

### Task 3: Fix `src/e2e/testUtils.ts` (shared test infra — fix properly, no nocheck)

**Files:**
- Modify: `src/e2e/testUtils.ts:15-17` (trashChat), `src/e2e/testUtils.ts:118` (StoredDocument)

- [ ] **Step 1: Give `trashChat` an explicit return on the fall-through path** (TS7030)

```ts
export const trashChat = (): undefined | Promise<Document[]> => {
  if (game.messages?.size) return game.messages?.documentClass.deleteDocuments([], { deleteAll: true });
  return undefined;
};
```

- [ ] **Step 2: Replace the removed v12 `StoredDocument` global** (TS2304 ×3)

fvtt-types v13 deleted `StoredDocument<T>`. For test utilities, plain `Actor` is sufficient:

```ts
export const createActorTestItem = async (
  actor: Actor | undefined,
  type: string,
  name = `New Actor Test ${type.capitalize()}`,
  data: object = {},
) => actor?.createEmbeddedDocuments("Item", [{ type, name, ...data }]);
```

(If other `StoredDocument<...>` references exist in this file, replace each with its bare type argument the same way: `grep -n "StoredDocument" src/e2e/testUtils.ts` must end up empty.)

- [ ] **Step 3: Verify**

```bash
npm run build 2>&1 | grep -E "testUtils" | grep -c "plugin typescript"
```

Expected: `0`.

- [ ] **Step 4: Commit**

```bash
git add src/e2e/testUtils.ts
git commit -m "fix(e2e): migrate testUtils off removed v12 StoredDocument global, explicit trashChat return"
```

---

### Task 4: Missing `OSECombatant` import in `combat.ts` (TS2552)

`src/module/combat/combat.ts:234` annotates `assignGroup(combatant: OSECombatant, ...)` but the file never imports the class.

**Files:**
- Modify: `src/module/combat/combat.ts:1-6` (import block)

- [ ] **Step 1: Add the type-only import** after the existing imports (`combat.ts:6`):

```ts
import type { OSECombatant } from "./combatant";
```

- [ ] **Step 2: Verify**

```bash
npm run build 2>&1 | grep -c "TS2552"
```

Expected: `0`. Also run `npm run lint` — Biome enforces import sorting; run `npm run fix` if it complains about order.

- [ ] **Step 3: Commit**

```bash
git add src/module/combat/combat.ts
git commit -m "fix(combat): import OSECombatant type used in assignGroup signature"
```

---

### Task 5: `settings.ts` non-generic cast + stale `@ts-expect-error` (TS2315, TS2578)

**Files:**
- Modify: `src/module/settings.ts:67`
- Modify: `src/module/helpers-chat.ts:120-121`

- [ ] **Step 1: Replace the v12-generic `SettingConfig` cast** — v13's `SettingConfig` is not generic. In `settings.ts:64-67` change the cast only:

```ts
    choices: Object.values(CONFIG.OSE.encumbranceOptions).reduce((obj, enc) => {
      obj[enc.type] = enc.localizedLabel;
      return obj;
    }, {}) as Record<EncumbranceOption, string>,
```

- [ ] **Step 2: Delete the stale suppression** in `helpers-chat.ts` — under the pinned types `msg?.blind` now type-checks, so the directive itself errors. Remove only the comment line:

```ts
  if (
    msg?.blind &&
    !game.user?.isGM &&
```

- [ ] **Step 3: Verify**

```bash
npm run build 2>&1 | tee /tmp/build-task5.log | grep -cE "TS2315|TS2578"
```

Expected: `0`. Then confirm the overall count:

```bash
grep -c "plugin typescript" /tmp/build-task5.log
```

Expected: **~60–70**, and every remaining warning should be in the document-wiring family (spot-check: `grep "plugin typescript" /tmp/build-task5.log | grep -vE "combat|combatant|rings|sheet" || true` should return little or nothing).

- [ ] **Step 4: Commit**

```bash
git add src/module/settings.ts src/module/helpers-chat.ts
git commit -m "fix(types): v13 SettingConfig cast, drop stale ts-expect-error"
```

---

### Task 6: Sass `@import` → `@use` migration (11 deprecation warnings)

**Files:**
- Modify: `src/ose.scss` (9 `@import` rules), `src/scss/character.scss:1`, `src/scss/actor-base.scss:1`, plus any member references the migrator namespaces (`$var` → `variables.$var`)

- [ ] **Step 1: Snapshot current CSS output**

```bash
npm run build:css && cp dist/ose.css /tmp/ose-css-before.css
```

- [ ] **Step 2: Run the official migrator**

```bash
npx sass-migrator module --migrate-deps src/ose.scss
git diff --stat
```

Expected: changes in `src/ose.scss` and several files under `src/scss/`.

- [ ] **Step 3: Verify zero deprecation warnings and identical output**

```bash
npm run build:css 2>&1 | grep -ci "deprecation"
diff /tmp/ose-css-before.css dist/ose.css && echo IDENTICAL
```

Expected: `0` and `IDENTICAL`. If the diff is non-empty, the likely cause is `@use` deduplicating `variables.scss` (imported three times pre-migration). Inspect the diff: pure rule reordering/dedup is acceptable; any changed selector or property value is NOT — stop and report rather than committing.

- [ ] **Step 4: Commit**

```bash
git add -A src/ose.scss src/scss
git commit -m "chore(styles): migrate sass @import to @use/@forward (Dart Sass 3 prep)"
```

---

### Task 7: `npm audit fix` (11 of 17 advisories auto-fixable)

The remaining 6 are transitive dev-deps of fvtt-types (tinymce, socket.io, handlebars, etc. — mirrors of Foundry's own client deps, never shipped in `dist/`); accept those.

**Files:**
- Modify: `package-lock.json` (possibly `package.json` if semver ranges move)

- [ ] **Step 1: Apply** — plain fix, never `--force` (force would jump rollup a major):

```bash
npm audit fix
npm audit | tail -5
```

Expected: vulnerabilities drop from 17 to ~6, all remaining under the fvtt-types subtree.

- [ ] **Step 2: Verify the build is unaffected**

```bash
npm run build 2>&1 | grep -c "plugin typescript"
```

Expected: same count as Task 5 Step 3 (±0), exit 0, `dist/ose.js` + `dist/ose.css` present.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): npm audit fix for auto-resolvable advisories"
```

---

### Task 8: Final verification and PR

- [ ] **Step 1: Full gate**

```bash
npm run build 2>&1 | tee /tmp/build-final.log >/dev/null
grep -c "plugin typescript" /tmp/build-final.log
npm run typecheck 2>&1 | tail -3
npm run lint
```

Expected: ~60–70 build warnings (all wiring-family), typecheck and lint consistent with the build (typecheck uses the same tsconfig, so `@ts-nocheck` silences tests there too).

- [ ] **Step 2: Document the residual** — paste the deduplicated remaining warnings into the PR body as the scope statement for the follow-up wiring plan:

```bash
grep "plugin typescript" /tmp/build-final.log | sed 's/(![^)]*)] //' | sort | uniq -c | sort -rn | head -20
```

- [ ] **Step 3: Push and open a stacked PR** (base = `feat/types-package-slim`, NOT main — these fixes assume that branch's pinned fvtt-types; retarget to main after it merges):

```bash
git push -u origin fix/build-warnings
gh pr create --base feat/types-package-slim --title "Fix build warnings: 782 → ~60 (+ sass @use migration)" \
  --body "$(cat <<'EOF'
Reduces npm run build warnings from 782 to the ~60 that require fvtt-types v13 DataModelConfig/DocumentClassConfig wiring (tracked separately).

- ts-nocheck on v12-era Quench test files (706 warnings; bundled via src/ose.js → ./e2e so they cannot be tsconfig-excluded)
- global.d.ts augmentations: String.capitalize, Number.isNumeric, CombatRoundEventContext (fvtt-types main-entry gaps, same pattern as existing Math.clamp workaround)
- testUtils: drop removed v12 StoredDocument global, explicit trashChat return
- combat.ts: missing OSECombatant type import
- settings.ts: v13 non-generic SettingConfig cast; helpers-chat: stale @ts-expect-error
- sass @import → @use (Dart Sass 3 prep), CSS output verified byte-identical
- npm audit fix (17 → ~6 advisories; remainder are fvtt-types transitive dev-deps)

## Residual warnings (follow-up plan)
<paste Step 2 output here>
EOF
)"
```

---

## Self-review notes

- Spec coverage: all 7 build-warning types + 2 npm-install findings from the audit have a task or an explicit out-of-scope entry (warning #3 → deferred wiring plan; #5 strictness → mostly subsumed by Tasks 1-2, remainder is wiring-family and listed in the residual).
- The `defeated`→`isDefeated` trap and the do-not-annotate-callbacks note are documented in Out of scope so an executor doesn't introduce regressions chasing warning counts.
- Counts are approximate by design; each task verifies a *specific* warning code hitting zero, which is exact.
