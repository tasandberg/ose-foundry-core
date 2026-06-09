/**
 * @file Public `actor.system` data shapes for the `character` and `monster`
 * Actor types.
 *
 * Hand-transcribed from `src/module/actor/data-model-character.js`,
 * `data-model-monster.js` and `template.json`.
 *
 * OSE replaces several `system` properties with rich helper-class instances
 * inside `prepareDerivedData()`. Two flavours are exported:
 *  - `*SystemSource` — the raw, stored shape (what `defineSchema()` persists).
 *  - `*SystemData`   — the prepared, runtime shape read off a live document
 *                       (`scores`, `ac`/`aac`, `movement`, `encumbrance`,
 *                       `spells` swapped for their helper-class interfaces).
 *
 * @typeParam TItem - The Item type for spell lists. Defaults to `unknown`;
 * pass the League `Item` type for full fidelity.
 */
import type {
  CharacterAC,
  CharacterEncumbrance,
  CharacterMove,
  CharacterScores,
  CharacterSpells,
} from "./character-models";
import type { Save } from "./config-types";

/* -------------------------------------------- */
/*  Shared sub-shapes                            */
/* -------------------------------------------- */

export interface Retainer {
  enabled: boolean;
  loyalty: number;
  wage: string;
}

export interface Hp {
  hd: string;
  value: number;
  max: number;
}

/** Saving-throw block, keyed by the config `Save` union. */
export type SavesData = Record<Save, { value: number }>;

export interface Thac0 {
  value: number;
  bba: number;
  mod: { missile: number; melee: number };
}

export interface Initiative {
  value: number;
  mod: number;
}

export interface LanguagesData {
  value: string[];
}

/** A single stored ability score (before derivation). */
export interface AbilityScoreSource {
  value: number;
  bonus: number;
}

export type ScoresSource = Record<
  "str" | "int" | "wis" | "dex" | "con" | "cha",
  AbilityScoreSource
>;

/** Stored spell-slot configuration (`spellcaster` template). */
export interface SpellsSource {
  enabled: boolean;
  1: { max: number };
  2: { max: number };
  3: { max: number };
  4: { max: number };
  5: { max: number };
  6: { max: number };
}

export interface Xp {
  share: number;
  next: number;
  value: number;
  bonus: number;
}

/** Fields shared by `character` and `monster` (the `common` template). */
interface CommonActorSource {
  retainer: Retainer;
  hp: Hp;
  thac0: Thac0;
  saves: SavesData;
  initiative: Initiative;
  languages: LanguagesData;
}

/* -------------------------------------------- */
/*  Character                                    */
/* -------------------------------------------- */

export interface CharacterDetails {
  biography: string;
  notes: string;
  class: string;
  title: string;
  alignment: string;
  level: number;
  xp: Xp;
}

export interface CharacterExploration {
  ld: number;
  od: number;
  sd: number;
  ft: number;
}

/** Stored encumbrance shape for a character (the `complete`/`detailed` schema). */
export interface CharacterEncumbranceSource {
  variant: string;
  enabled: boolean;
  encumbered: boolean;
  pct: number;
  steps: number[];
  value: number;
  max: number;
  atFirstBreakpoint: boolean;
  atSecondBreakpoint: boolean;
  atThirdBreakpoint: boolean;
}

/** Raw, stored `character.system` (pre-`prepareDerivedData`). */
export interface CharacterSystemSource extends CommonActorSource {
  config: { movementAuto: boolean };
  details: CharacterDetails;
  exploration: CharacterExploration;
  scores: ScoresSource;
  spells: SpellsSource;
  encumbrance: CharacterEncumbranceSource;
  ac: { value: number; mod: number };
  aac: { value: number; mod: number };
  movement: { base: number };
}

/** Prepared, runtime `character.system` (what you read off a live Actor). */
export interface CharacterSystemData<TItem = unknown>
  extends CommonActorSource {
  config: { movementAuto: boolean };
  details: CharacterDetails;
  exploration: CharacterExploration;
  scores: CharacterScores;
  spells: CharacterSpells<TItem>;
  encumbrance: CharacterEncumbrance;
  ac: CharacterAC;
  aac: CharacterAC;
  movement: CharacterMove;
}

/* -------------------------------------------- */
/*  Monster                                      */
/* -------------------------------------------- */

export interface MonsterDetails {
  biography: string;
  alignment: string;
  xp: number;
  specialAbilities: number;
  treasure: { table: string; type: string };
  appearing: { d: number; w: number };
  morale: number;
}

/** Raw, stored `monster.system` (pre-`prepareDerivedData`). */
export interface MonsterSystemSource extends CommonActorSource {
  details: MonsterDetails;
  attacks: string;
  spells: SpellsSource;
  encumbrance: { value: number; max: number };
  ac: { value: number; mod: number };
  aac: { value: number; mod: number };
  movement: { base: number };
}

/** Prepared, runtime `monster.system`. */
export interface MonsterSystemData<TItem = unknown> extends CommonActorSource {
  details: MonsterDetails;
  attacks: string;
  spells: CharacterSpells<TItem>;
  encumbrance: CharacterEncumbrance;
  ac: { value: number; mod: number };
  aac: { value: number; mod: number };
  movement: CharacterMove;
}

/** Discriminated map of Actor `type` → prepared `system` shape. */
export interface ActorSystemDataByType<TItem = unknown> {
  character: CharacterSystemData<TItem>;
  monster: MonsterSystemData<TItem>;
}

export type AnyActorSystemData<TItem = unknown> =
  ActorSystemDataByType<TItem>[keyof ActorSystemDataByType<TItem>];
