/**
 * @file First-class Foundry-coupled Actor & Item types for OSE.
 *
 * These intersect Foundry's real `Actor` and `Item` document types (from
 * `@league-of-foundry-developers/foundry-vtt-types`, a peer dependency) with
 * OSE's discriminated `type` literal and per-type `system` shape. Consumers
 * get the full Foundry document surface (`update`, `getFlag`, `items`,
 * ownership, etc.) **and** OSE-specific typing on `system` and `type` —
 * automatically.
 *
 *   import type { OseCharacter } from "@ose-foundry-core/types";
 *
 *   declare const pc: OseCharacter;
 *   pc.update({ name: "Conan" });        // ✓ Foundry Actor method
 *   pc.getFlag("my-mod", "key");         // ✓
 *   pc.system.scores.str.mod;            // ✓ OSE-specific typing
 *
 * Naming:
 *  - `OseActor` / `AnyOseItem` — discriminated unions.
 *  - `OseCharacter` / `OseMonster` / `OseWeapon` / … — narrowed variants.
 *
 * Variants are declared as explicit intersections rather than derived via
 * `Extract<AnyOse…, { type: T }>`, because distributing `Extract` over
 * Foundry's complex generic `Actor` / `Item` types triggers TS instantiation
 * blow-up. The explicit form is also more readable in the emitted `.d.ts`.
 */
import type {
  ActorSystemDataByType,
  CharacterSystemData,
  MonsterSystemData,
} from "./actor-data";
import type {
  AbilitySystemData,
  ArmorSystemData,
  ContainerSystemData,
  ItemSystemData,
  ItemSystemDataByType,
  SpellSystemData,
  WeaponSystemData,
} from "./item-data";

/** Actor type discriminant — `"character" | "monster"`. */
export type ActorType = keyof ActorSystemDataByType;

/** Item type discriminant — `"item" | "weapon" | "armor" | "spell" | "ability" | "container"`. */
export type ItemType = keyof ItemSystemDataByType;

/* -------------------------------------------- */
/*  Items                                        */
/* -------------------------------------------- */

/** A generic OSE Item (the `"item"` type — gear / treasure). */
export type OseItem = Item & { type: "item"; system: ItemSystemData };
export type OseWeapon = Item & { type: "weapon"; system: WeaponSystemData };
export type OseArmor = Item & { type: "armor"; system: ArmorSystemData };
export type OseSpell = Item & { type: "spell"; system: SpellSystemData };
export type OseAbility = Item & { type: "ability"; system: AbilitySystemData };
export type OseContainer = Item & {
  type: "container";
  system: ContainerSystemData;
};

/** Any OSE Item, as a discriminated union over Foundry's `Item`. */
export type AnyOseItem =
  | OseItem
  | OseWeapon
  | OseArmor
  | OseSpell
  | OseAbility
  | OseContainer;

/** Map an Item `type` discriminant to its concrete variant. */
export interface OseItemByType {
  item: OseItem;
  weapon: OseWeapon;
  armor: OseArmor;
  spell: OseSpell;
  ability: OseAbility;
  container: OseContainer;
}

/** Pick a single Item variant by `type` — e.g. `OseItemOfType<"weapon">`. */
export type OseItemOfType<T extends ItemType> = OseItemByType[T];

/* -------------------------------------------- */
/*  Actors                                       */
/* -------------------------------------------- */

/** A player character (`type: "character"`). */
export type OseCharacter = Actor & {
  type: "character";
  system: CharacterSystemData;
};

/** A monster (`type: "monster"`). */
export type OseMonster = Actor & {
  type: "monster";
  system: MonsterSystemData;
};

/**
 * An NPC. Alias for {@link OseMonster} — OSE's template only distinguishes
 * `"character"` (PCs) and `"monster"` (everything else, including humanoid
 * NPCs), so this is purely a naming convenience.
 */
export type OseNpc = OseMonster;

/**
 * The canonical "any OSE actor" type — discriminated union of every actor
 * variant. Use this as your default when typing a parameter or field that
 * could be a character or a monster; access shared fields directly, or
 * narrow on `type` to refine `system` per variant:
 *
 *   if (actor.type === "character") actor.system.scores.str.mod;
 */
export type OseActor = OseCharacter | OseMonster;

/** Map an Actor `type` discriminant to its concrete variant. */
export interface OseActorByType {
  character: OseCharacter;
  monster: OseMonster;
}

/** Pick a single Actor variant by `type` — e.g. `OseActorOfType<"character">`. */
export type OseActorOfType<T extends ActorType> = OseActorByType[T];
