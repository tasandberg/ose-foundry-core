/**
 * @file Public OSE config union types.
 *
 * Hand-authored explicit literal unions mirroring `src/module/config.ts`.
 * They are deliberately NOT `keyof typeof OSE` re-exports: that would drag the
 * (proprietary, Foundry-namespace-dependent) `OSE` const type into the shipped
 * declarations. Parity with the real config is enforced at compile time by
 * `src/api/__tests__/drift.test-d.ts` (run in CI, where the real Foundry types
 * exist).
 */

/** Ability score keys (`OseConfig["scores"]`). */
export type Attribute = "str" | "int" | "dex" | "wis" | "con" | "cha";

/** Exploration skill keys (`OseConfig["exploration_skills"]`). */
export type ExplorationSkill = "ld" | "od" | "sd" | "fs";

/** Roll comparison operators (`OseConfig["roll_type"]`). */
export type RollType = "result" | "above" | "below";

/** Saving-throw keys (`OseConfig["saves_long"]`). */
export type Save = "death" | "wand" | "paralysis" | "breath" | "spell";

/** Armor categories (`OseConfig["armor"]`). */
export type Armor = "unarmored" | "light" | "heavy" | "shield";

/** Token/encounter colors (`OseConfig["colors"]`). */
export type Color =
  | "green"
  | "red"
  | "yellow"
  | "purple"
  | "blue"
  | "orange"
  | "white";

/** Weapon/armor inventory tags (`OseConfig["tags"]`). */
export type InventoryItemTag =
  | "melee"
  | "missile"
  | "slow"
  | "twohanded"
  | "blunt"
  | "brace"
  | "splash"
  | "reload"
  | "charge";

/** Encumbrance scheme keys (`OseConfig["encumbranceOptions"]`). */
export type EncumbranceOption =
  | "basic"
  | "detailed"
  | "complete"
  | "disabled"
  | "itembased";

/** Damage-application target modes (`OseConfig["apply_damage_options"]`). */
export type ApplyDamageOption = "selected" | "targeted" | "originalTarget";

/**
 * The stable, serializable portion of the system's `CONFIG.OSE` object — the
 * label/value maps consumers actually read. Runtime-only members of the real
 * `OSE` const (path getters, the live `encumbrance` accessor, the
 * `auto_tags`/`tag_images` getter objects) are intentionally omitted; they are
 * not part of the supported public contract.
 */
export interface OseConfig {
  scores: Record<Attribute, string>;
  scores_short: Record<Attribute, string>;
  exploration_skills: Record<ExplorationSkill, string>;
  exploration_skills_short: Record<ExplorationSkill, string>;
  roll_type: Record<RollType, string>;
  saves_short: Record<Save, string>;
  saves_long: Record<Save, string>;
  armor: Record<Armor, string>;
  apply_damage_options: Record<ApplyDamageOption, string>;
  colors: Record<Color, string>;
  languages: string[];
  tags: Record<InventoryItemTag, string>;
  monster_thac0: Record<number, number>;
  monster_saves: Record<number, Record<"d" | "w" | "p" | "b" | "s", number>>;
}
