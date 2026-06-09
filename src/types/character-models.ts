/**
 * @file Public interfaces for the character helper-class instances that OSE
 * swaps into `actor.system` during `prepareDerivedData()`.
 *
 * Hand-redeclared (rather than re-exported from the system source) for two
 * reasons:
 *  1. Re-exporting drags non-type-only code into the types build, which fails
 *     when the system's TypeScript transiently doesn't satisfy the League
 *     `foundry-vtt-types` it's pinned against.
 *  2. The system source files live outside `tsconfig.types.json`'s `rootDir`
 *     and can't legally be included.
 *
 * Parity with the system's real interfaces is enforced by the compile-time
 * drift guard at `src/types/__tests__/drift.test-d.ts`.
 *
 * The `Item[]` reference in `CharacterSpells` resolves to Foundry's global
 * `Item` (provided by the `foundry-vtt-types` peer dependency).
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

/** Prepared `system.spells` (`OseDataModelCharacterSpells`). */
export interface CharacterSpells {
  enabled: boolean;
  spellList: { [level: number]: Item[] };
  slots: { [level: number]: SpellSlot };
}
