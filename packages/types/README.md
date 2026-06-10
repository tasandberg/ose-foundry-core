# @ose-foundry-core/types

TypeScript types for the [Old-School Essentials
(OSE)](https://github.com/tasandberg/ose-foundry-core) Foundry VTT system.

This package is intentionally minimal in its initial release. It re-exports
**only the types that are already explicitly declared in OSE's TypeScript
source** — config unions, the character helper-class interfaces, and the
character class definitions. The shipped surface grows automatically as the
system's remaining `.js` data models are converted to `.ts`.

The package ships a single declaration-only entrypoint (`index.d.ts`). It
contains **no runtime code**.

## Install

```sh
npm i -D @ose-foundry-core/types
# or pnpm add -D @ose-foundry-core/types
```

### Required peer

`@league-of-foundry-developers/foundry-vtt-types` is a peer dependency — some
of the re-exported types reference Foundry's global `Item` type. Install the
same git-pinned ref the OSE system uses:

```sh
npm i -D "@league-of-foundry-developers/foundry-vtt-types@github:League-of-Foundry-Developers/foundry-vtt-types#main"
```

The bundle begins with a triple-slash reference so once the peer is installed
the Foundry globals resolve automatically.

## What's exported

| Group | Types |
|---|---|
| **Config unions** (from `src/module/config.ts`) | `OseConfig`, `Save`, `Armor`, `Attribute`, `ExplorationSkill`, `RollType`, `Color`, `InventoryItemTag`, `EncumbranceOption`, `ApplyDamageOption` |
| **Character helper interfaces** (from `src/module/actor/data-model-classes/*.ts`) | `CharacterScores`, `CharacterAC`, `CharacterMove`, `CharacterEncumbrance`, `CharacterSpells` |
| **Classes** (from `src/types/classes.ts`) | `ClassicClassName`, `OseClass` |

## Usage

```ts
import type { Save, CharacterScores, ClassicClassName } from "@ose-foundry-core/types";

function rollSave(scoreType: Save) { /* … */ }

const klass: ClassicClassName = "Magic-User";   // ✓
// const bad: ClassicClassName = "Sorcerer";    // ✗ type error
```

## Roadmap

As the system migrates its `.js` data models to `.ts`, the explicit type
definitions in those files become eligible for re-export here. Likely future
additions, in roughly the order they'd land:

- `WeaponSystemData`, `ItemSystemData`, `ArmorSystemData`, `SpellSystemData`,
  `AbilitySystemData`, `ContainerSystemData` — when `src/module/item/data-model-*.js` move to TypeScript
- `CharacterSystemData` / `MonsterSystemData` (and their `*Source` variants) —
  when the actor data models migrate
- Document-level convenience types (e.g. `OseCharacter = Actor & { type: "character"; … }`) — once the system data shapes are available to compose with

## Maintenance

`index.d.ts` is **generated** — do not edit it. It is produced from
`src/types/` in the system repo via `npm run build:types` (a declaration-only
`tsc` pass bundled with `rollup-plugin-dts`).

Because every type is a direct re-export of a system declaration, no drift
guard is needed: there is no second copy to drift from.
