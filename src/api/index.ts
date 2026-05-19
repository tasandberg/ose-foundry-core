/**
 * @file Public type surface for `@ose-foundry-core/types`.
 *
 * This is the ONLY entrypoint shipped to consumers. It is type-only: it emits
 * no runtime code, is never imported by the Foundry bundle (`src/ose.js`), and
 * has ZERO dependency on Foundry types (proprietary or League).
 *
 * Parity with the system's own source of truth is enforced at compile time by
 * `src/api/__tests__/drift.test-d.ts`, which runs in CI where the real Foundry
 * types exist.
 */
export type { Tag, DerivedTag, ValueMax } from "./common";

export type {
  Attribute,
  ExplorationSkill,
  RollType,
  Save,
  Armor,
  Color,
  InventoryItemTag,
  EncumbranceOption,
  ApplyDamageOption,
  OseConfig,
} from "./config-types";

export type {
  AbilityScore,
  CharacterScores,
  CharacterAC,
  CharacterMove,
  CharacterEncumbrance,
  SpellSlot,
  CharacterSpells,
} from "./character-models";

export type {
  ItemSystemData,
  WeaponSystemData,
  ArmorSystemData,
  ArmorType,
  SpellSystemData,
  AbilitySystemData,
  ContainerSystemData,
  ItemSystemDataByType,
  AnyItemSystemData,
} from "./item-data";

export type {
  Retainer,
  Hp,
  SavesData,
  Thac0,
  Initiative,
  LanguagesData,
  AbilityScoreSource,
  ScoresSource,
  SpellsSource,
  Xp,
  CharacterDetails,
  CharacterExploration,
  CharacterEncumbranceSource,
  CharacterSystemSource,
  CharacterSystemData,
  MonsterDetails,
  MonsterSystemSource,
  MonsterSystemData,
  ActorSystemDataByType,
  AnyActorSystemData,
} from "./actor-data";
