# @ose-foundry-core/types

TypeScript type definitions for the [Old-School Essentials (OSE) Foundry VTT
system](https://github.com/tasandberg/ose-foundry-core).

Use these in your own module/system TypeScript projects to get fully-typed
access to OSE's actor & item `system` data, config unions, and the character
helper-class interfaces — instead of re-deriving shapes from `template.json` by
hand (which drifts).

The package ships a single hand-curated, declaration-only entrypoint
(`index.d.ts`). It contains **no runtime code** and has **zero dependencies**.

## Install

```sh
npm i -D @ose-foundry-core/types
```

The package version tracks the OSE system version 1:1 (each system release
publishes a matching types release; pre-releases are published under the
`next` dist-tag).

## No Foundry types required

The surface is intentionally **self-contained** — it does not depend on
Foundry's own types (neither the proprietary first-party types nor the
community `@league-of-foundry-developers/foundry-vtt-types`). It works in any
TypeScript project on its own.

The few fields that hold Foundry `Item` instances (a container's `contents`,
the prepared spell list) are **generic**, defaulting to `unknown`. If you use
the League Foundry types you can opt into full fidelity by supplying the `Item`
type yourself:

```ts
import type { ContainerSystemData, CharacterSystemData } from "@ose-foundry-core/types";

type Box = ContainerSystemData<Item>;          // contents: Item[] | null
type PC  = CharacterSystemData<Item>;          // spells.spellList: { [lvl]: Item[] }
```

## Usage

```ts
import type {
  CharacterSystemData,
  WeaponSystemData,
  Save,
  ArmorType,
} from "@ose-foundry-core/types";

function rollSave(system: CharacterSystemData, type: Save) {
  return system.saves[type].value;
}

const weapon: WeaponSystemData = item.system;
```

### Source vs. prepared shapes

OSE swaps several `system` properties for rich helper-class instances inside
`prepareDerivedData()`. Two flavours are exported:

- `*SystemSource` — the raw, stored shape (what `defineSchema()` persists).
- `*SystemData` — the prepared, runtime shape read off a live document
  (`scores`, `ac`/`aac`, `movement`, `encumbrance`, `spells` swapped for their
  helper-class interfaces such as `CharacterScores`, `CharacterAC`).

Read live documents as `*SystemData`; type migration/creation payloads as
`*SystemSource`.

## Maintenance

`index.d.ts` is **generated** — do not edit it. It is produced from
`src/api/` in the system repo via `npm run build:types` (a hermetic,
Foundry-free declaration-only `tsc` pass bundled with `rollup-plugin-dts`,
using the repo's own TypeScript).

`src/api/` is hand-authored and self-contained so it can build anywhere. It is
kept honest by a compile-time **drift guard**
(`src/api/__tests__/drift.test-d.ts`) that imports the system's real internal
types and fails CI if the public copies diverge.
