/**
 * @file Public `item.system` data shapes for every OSE Item type.
 *
 * Hand-transcribed from the per-type `defineSchema()` definitions in
 * `src/module/item/data-model-*.js` and the defaults in `template.json`.
 * Derived getters exposed on the live `TypeDataModel` instance (e.g.
 * `autoTags`, `cumulativeWeight`) are included as `readonly` members.
 */
import type { Armor } from "./config-types";
import type { DerivedTag, Tag, ValueMax } from "./common";

/** Stored fields shared by all `physical` items. */
interface PhysicalItemFields {
  cost: number;
  containerId: string;
  quantity: ValueMax;
  weight: number;
  itemslots: number;
}

/** Derived tag getters present on every Item data model instance. */
interface DerivedTagGetters {
  readonly autoTags: DerivedTag[];
  readonly manualTags: Tag[] | null;
}

/** `item.system` for the generic `item` type (gear / treasure). */
export interface ItemSystemData extends PhysicalItemFields, DerivedTagGetters {
  treasure: boolean;
  description: string;
  tags: Tag[];
  equipped: boolean;
  readonly cumulativeWeight: number;
  readonly cumulativeCost: number;
  readonly cumulativeItemslots: number;
  readonly isCoinsOrGems: boolean;
}

/** `item.system` for the `weapon` type. */
export interface WeaponSystemData extends PhysicalItemFields, DerivedTagGetters {
  damage: string;
  description: string;
  tags: Tag[];
  equipped: boolean;
  save: string;
  range: { short: number; medium: number; long: number };
  bonus: number;
  pattern: string;
  missile: boolean;
  melee: boolean;
  slow: boolean;
  counter: ValueMax;
  readonly qualities: DerivedTag[];
}

/** Armor categories. Kept in lockstep with the config `Armor` union. */
export type ArmorType = Armor;

/** `item.system` for the `armor` type. */
export interface ArmorSystemData extends PhysicalItemFields, DerivedTagGetters {
  type: ArmorType;
  ac: { value: number };
  aac: { value: number };
  description: string;
  tags: Tag[];
  equipped: boolean;
}

/** `item.system` for the `spell` type. */
export interface SpellSystemData extends DerivedTagGetters {
  save: string;
  lvl: number;
  class: string;
  duration: string;
  range: string;
  roll: string;
  memorized: number;
  cast: number;
  description: string;
  tags: Tag[];
}

/** `item.system` for the `ability` type. */
export interface AbilitySystemData extends DerivedTagGetters {
  save: string;
  pattern: string;
  requirements: string;
  roll: string;
  rollType: string;
  rollTarget: number;
  blindroll: boolean;
  description: string;
  tags: Tag[];
}

/**
 * `item.system` for the `container` type.
 *
 * @typeParam TItem - The contained Item type. Defaults to `unknown`; pass the
 * League `Item` type for full fidelity.
 */
export interface ContainerSystemData<TItem = unknown>
  extends PhysicalItemFields,
    DerivedTagGetters {
  itemIds: string[];
  description: string;
  tags: Tag[];
  equipped: boolean;
  /** Items whose `system.containerId` points at this container. */
  readonly contents: TItem[] | null;
  readonly totalWeight: number;
}

/** Discriminated map of Item `type` → its `system` shape. */
export interface ItemSystemDataByType<TItem = unknown> {
  item: ItemSystemData;
  weapon: WeaponSystemData;
  armor: ArmorSystemData;
  spell: SpellSystemData;
  ability: AbilitySystemData;
  container: ContainerSystemData<TItem>;
}

/** Union of every Item `system` shape. */
export type AnyItemSystemData<TItem = unknown> =
  ItemSystemDataByType<TItem>[keyof ItemSystemDataByType<TItem>];
