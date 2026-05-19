/**
 * @file Public interfaces for the character helper classes that OSE swaps in
 * during `prepareDerivedData()`.
 *
 * These are self-contained re-declarations of the system's own interfaces
 * (`OseDataModelCharacter{Scores,AC,Move,Encumbrance,Spells}`). They are kept
 * structurally identical to the originals by the compile-time drift guard in
 * `src/api/__tests__/drift.test-d.ts`.
 *
 * The only Foundry-coupled member is the spell list (an array of Items). Rather
 * than depend on Foundry's types, it is parameterized: `TItem` defaults to
 * `unknown`; consumers can supply the League `Item` type for full fidelity.
 */

/** A single derived ability score. */
export interface AbilityScore {
  value: number;
  bonus: number;
  mod: number;
}

/** Prepared `system.scores` (`OseDataModelCharacterScores`). */
export interface CharacterScores {
  str: AbilityScore & { od: number };
  int: AbilityScore & { literacy: string; spoken: string };
  wis: AbilityScore;
  dex: AbilityScore & { init: number };
  con: AbilityScore;
  cha: AbilityScore & { loyalty: number; retain: number; npc: number };
}

/** Prepared `system.ac` / `system.aac` (`OseDataModelCharacterAC`). */
export interface CharacterAC {
  base: number;
  naked: number;
  shield: number;
  value: number;
  mod: number;
}

/** Prepared `system.movement` (`OseDataModelCharacterMove`). */
export interface CharacterMove {
  base: number;
  encounter: number;
  overland: number;
}

/** Prepared `system.encumbrance` (`OseDataModelCharacterEncumbrance`). */
export interface CharacterEncumbrance {
  variant: string;
  enabled: boolean;
  pct: number;
  encumbered: boolean;
  steps: number[];
  value: number;
  max: number;
  atFirstBreakpoint: boolean | null;
  atSecondBreakpoint: boolean | null;
  atThirdBreakpoint: boolean | null;
}

/** A single spell-level slot tally. */
export interface SpellSlot {
  used: number;
  max: number;
}

/**
 * Prepared `system.spells` (`OseDataModelCharacterSpells`).
 *
 * @typeParam TItem - The spell Item type. Defaults to `unknown`; pass the
 * League `Item` type for full fidelity.
 */
export interface CharacterSpells<TItem = unknown> {
  enabled: boolean;
  spellList: { [level: number]: TItem[] };
  slots: { [level: number]: SpellSlot };
}
