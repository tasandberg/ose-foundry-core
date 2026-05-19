/**
 * @file Compile-time drift guard for the public type surface.
 *
 * `src/api/*` is hand-authored and self-contained (no Foundry imports) so it
 * can be built hermetically. This file is the single mechanism that keeps it
 * honest: it imports the system's REAL types and asserts the hand-authored
 * public copies are structurally identical. Any divergence fails the base
 * `tsc` typecheck (and therefore CI).
 *
 * It is type-checked by the base tsconfig (which has the real Foundry types in
 * dev/CI) and is EXCLUDED from `tsconfig.types.json` (the hermetic, Foundry-
 * free declaration build). It emits no runtime code; assertion aliases are
 * `export`ed so `noUnusedLocals` does not flag them.
 */
import type { OseConfig as RealOseConfig } from "../../module/config";
import type { CharacterAC as RealAC } from "../../module/actor/data-model-classes/data-model-character-ac";
import type { CharacterEncumbrance as RealEnc } from "../../module/actor/data-model-classes/data-model-character-encumbrance";
import type { CharacterMove as RealMove } from "../../module/actor/data-model-classes/data-model-character-move";
import type { CharacterScores as RealScores } from "../../module/actor/data-model-classes/data-model-character-scores";
import type { CharacterSpells as RealSpells } from "../../module/actor/data-model-classes/data-model-character-spells";

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
import type {
  CharacterAC,
  CharacterEncumbrance,
  CharacterMove,
  CharacterScores,
  CharacterSpells,
} from "../character-models";

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

/* ---- Character helper-class interfaces must match the real ones ---- */
export type _Scores = Expect<Equal<CharacterScores, RealScores>>;
export type _AC = Expect<Equal<CharacterAC, RealAC>>;
export type _Move = Expect<Equal<CharacterMove, RealMove>>;
export type _Encumbrance = Expect<Equal<CharacterEncumbrance, RealEnc>>;
// Real `CharacterSpells` is hard-typed to Foundry's global `Item`; our public
// copy is generic. Instantiated with `Item` they must coincide exactly.
export type _Spells = Expect<Equal<CharacterSpells<Item>, RealSpells>>;
