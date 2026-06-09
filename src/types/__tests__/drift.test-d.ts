/**
 * @file Compile-time drift guard for the public config unions.
 *
 * The config union types (`Save`, `Armor`, `Attribute`, …) are hand-authored
 * as explicit string-literal unions in `config-types.ts` rather than re-
 * exported as `keyof typeof OSE[…]`. That keeps the emitted `.d.ts` readable
 * (no `typeof OSE` value-type leakage), but does mean the literal lists need
 * to stay in sync with the real `OseConfig` object.
 *
 * This file imports the system's REAL `OseConfig` and asserts every public
 * union equals the corresponding key set. Any divergence fails the base `tsc`
 * typecheck (and therefore CI). Sub-model interfaces (`CharacterScores` etc.)
 * are re-exported directly from system source files, so they cannot drift and
 * are not asserted here.
 *
 * Excluded from `tsconfig.types.json` (it imports system-coupled files); type-
 * checked by the base tsconfig in dev/CI. Assertion aliases are `export`ed so
 * `noUnusedLocals` does not flag them.
 */
import type { OseConfig as RealOseConfig } from "@module/config";
import type { CharacterAC as RealAC } from "@module/actor/data-model-classes/data-model-character-ac";
import type { CharacterEncumbrance as RealEnc } from "@module/actor/data-model-classes/data-model-character-encumbrance";
import type { CharacterMove as RealMove } from "@module/actor/data-model-classes/data-model-character-move";
import type { CharacterScores as RealScores } from "@module/actor/data-model-classes/data-model-character-scores";
import type { CharacterSpells as RealSpells } from "@module/actor/data-model-classes/data-model-character-spells";

import type {
  CharacterAC,
  CharacterEncumbrance,
  CharacterMove,
  CharacterScores,
  CharacterSpells,
} from "../character-models";
import type {
  ApplyDamageOption,
  Armor,
  Attribute,
  Color,
  EncumbranceOption,
  ExplorationSkill,
  InventoryItemTag,
  RollType,
  Save,
} from "../config-types";

/** True iff `A` and `B` are mutually assignable (invariant equality). */
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false;

type Expect<T extends true> = T;

/* ---- Config unions must equal the real `typeof OSE` key sets ---- */
export type _Attribute = Expect<Equal<Attribute, keyof RealOseConfig["scores"]>>;
export type _Exploration = Expect<
  Equal<ExplorationSkill, keyof RealOseConfig["exploration_skills"]>
>;
export type _RollType = Expect<
  Equal<RollType, keyof RealOseConfig["roll_type"]>
>;
export type _Save = Expect<Equal<Save, keyof RealOseConfig["saves_long"]>>;
export type _Armor = Expect<Equal<Armor, keyof RealOseConfig["armor"]>>;
export type _Color = Expect<Equal<Color, keyof RealOseConfig["colors"]>>;
export type _Tag = Expect<
  Equal<InventoryItemTag, keyof RealOseConfig["tags"]>
>;
export type _Enc = Expect<
  Equal<EncumbranceOption, keyof RealOseConfig["encumbranceOptions"]>
>;
export type _Dmg = Expect<
  Equal<ApplyDamageOption, keyof RealOseConfig["apply_damage_options"]>
>;

/* ---- Hand-redeclared character helper-class interfaces must match the
        system's own interfaces ---- */
export type _Scores = Expect<Equal<CharacterScores, RealScores>>;
export type _AC = Expect<Equal<CharacterAC, RealAC>>;
export type _Move = Expect<Equal<CharacterMove, RealMove>>;
export type _Encumbrance = Expect<Equal<CharacterEncumbrance, RealEnc>>;
export type _Spells = Expect<Equal<CharacterSpells, RealSpells>>;
