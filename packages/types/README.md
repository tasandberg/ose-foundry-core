# @ose-foundry-core/types

First-class TypeScript types for [Old-School Essentials
(OSE)](https://github.com/tasandberg/ose-foundry-core) Foundry VTT modules.

Provides `OseCharacter`, `OseMonster`, `OseWeapon`, … as **discriminated
unions of real Foundry `Actor` / `Item` documents** with OSE-specific `system`
and `type` typing baked in. Use them anywhere you'd use Foundry's `Actor` /
`Item` and get OSE's domain shapes for free — including `update()`,
`getFlag()`, `items`, ownership, and the rest of the Foundry document surface.

The package ships a single hand-curated, declaration-only entrypoint
(`index.d.ts`). It contains **no runtime code**.

## Install

```sh
npm i -D @ose-foundry-core/types
# or pnpm add -D @ose-foundry-core/types
```

### Required peer

`@league-of-foundry-developers/foundry-vtt-types` is a **peer dependency** —
the shipped types reference Foundry's global `Actor` and `Item`. Install the
same git-pinned ref the OSE system uses:

```sh
npm i -D "@league-of-foundry-developers/foundry-vtt-types@github:League-of-Foundry-Developers/foundry-vtt-types#main"
```

The bundle begins with
`/// <reference types="@league-of-foundry-developers/foundry-vtt-types" />`,
so once the peer is installed the Foundry globals resolve automatically.

## Usage

```ts
import type {
  OseCharacter,
  OseWeapon,
  Save,
} from "@ose-foundry-core/types";

declare const pc: OseCharacter;
pc.update({ name: "Conan" });        // ✓ Foundry Actor method
pc.getFlag("my-mod", "key");         // ✓ Foundry Actor method
pc.system.scores.str.mod;            // ✓ OSE-specific typing
pc.system.saves.death.value;         // ✓
pc.items;                            // typed as Foundry's EmbeddedCollection

declare const sword: OseWeapon;
sword.system.damage;                 // ✓ string
sword.update({ "system.damage": "1d10" });
```

### `OseActor` and `AnyOseItem` — the catch-all types

Both are discriminated unions over every variant. Use them as your default
when typing a parameter that could be any kind of actor or item; access shared
fields directly, or narrow on `type` for variant-specific access.

```ts
import type { OseActor, AnyOseItem } from "@ose-foundry-core/types";

function strMod(actor: OseActor): number {
  // Shared fields are reachable without narrowing —
  // TS auto-computes the common subset across the union.
  const hp = actor.system.hp.value;       // ✓ both variants have hp
  const init = actor.system.movement.base; // ✓
  if (actor.type === "character") {
    return actor.system.scores.str.mod;   // ✓ narrowed to CharacterSystemData
  }
  return 0;                                // monsters don't have scores
}

function damage(item: AnyOseItem): string | null {
  return item.type === "weapon" ? item.system.damage : null;
}
```

### Source vs. prepared shapes

OSE swaps several `system` properties for rich helper-class instances inside
`prepareDerivedData()`. Two flavours of system shape are exported:

- `*SystemSource` — the raw, stored shape (what `defineSchema()` persists).
- `*SystemData` — the prepared, runtime shape read off a live document
  (`scores`, `ac`/`aac`, `movement`, `encumbrance`, `spells` swapped for their
  helper-class interfaces such as `CharacterScores`, `CharacterAC`).

`OseCharacter` / `OseMonster` use the prepared (`*SystemData`) shape. When
typing creation / migration payloads, use the source variants directly:
`CharacterSystemSource`, `MonsterSystemSource`.

## What's exported

| Group | Types |
|---|---|
| **Actors** | `OseActor` *(union)*, `OseCharacter`, `OseMonster`, `OseNpc` *(alias for `OseMonster`)*, `OseActorOfType<T>`, `OseActorByType`, `ActorType` |
| **Items** | `AnyOseItem` *(union)*, `OseItem` *(gear)*, `OseWeapon`, `OseArmor`, `OseSpell`, `OseAbility`, `OseContainer`, `OseItemOfType<T>`, `OseItemByType`, `ItemType` |
| **System data** | `CharacterSystemData`/`*Source`, `MonsterSystemData`/`*Source`, plus `WeaponSystemData`, `ArmorSystemData`, `SpellSystemData`, `AbilitySystemData`, `ContainerSystemData`, `ItemSystemData` |
| **Character helper interfaces** | `CharacterScores`, `CharacterAC`, `CharacterMove`, `CharacterEncumbrance`, `CharacterSpells`, `AbilityScore`, `SpellSlot` |
| **Classes** | `ClassicClassName`, `OseClass` |
| **Config unions** | `Save`, `Armor`, `Attribute`, `ExplorationSkill`, `RollType`, `Color`, `InventoryItemTag`, `EncumbranceOption`, `ApplyDamageOption`, `OseConfig` |
| **Common** | `Tag`, `DerivedTag`, `ValueMax` |

## Maintenance

`index.d.ts` is **generated** — do not edit it. It is produced from
`src/types/` in the system repo via `npm run build:types` (a declaration-only
`tsc` pass bundled with `rollup-plugin-dts`).

A compile-time **drift guard** (`src/types/__tests__/drift.test-d.ts`) imports
the system's real `OseConfig` and character helper-class interfaces, and fails
CI if the hand-authored public copies diverge from the real ones.
