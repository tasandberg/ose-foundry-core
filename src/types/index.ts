/**
 * @file Public type surface for `@ose-foundry-core/types`.
 *
 * This is the ONLY entrypoint shipped to consumers. It is type-only: it emits
 * no runtime code and is never imported by the Foundry bundle (`src/ose.js`).
 *
 * The shipped declarations reference Foundry's global `Actor` and `Item` types
 * from `@league-of-foundry-developers/foundry-vtt-types`, which consumers
 * install as a peer dependency. Parity with the system's own source of truth
 * for the config unions is enforced by `src/types/__tests__/drift.test-d.ts`;
 * character helper-class interfaces are re-exported directly from the system,
 * so they cannot drift.
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

export type { ClassicClassName, OseClass } from "./classes";

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
  ActorType,
  ItemType,
  OseActor,
  AnyOseItem,
  OseActorByType,
  OseItemByType,
  OseActorOfType,
  OseItemOfType,
  OseCharacter,
  OseMonster,
  OseNpc,
  OseItem,
  OseWeapon,
  OseArmor,
  OseSpell,
  OseAbility,
  OseContainer,
} from "./documents";

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
