/**
 * @file Public type definitions for OSE character classes.
 *
 * Canonical home — the system's own `classic-fantasy-classes.ts` data file
 * imports these from here.
 */
import type { Attribute } from "../module/config";

/** The seven core classes from classic-fantasy OSE. */
export type ClassicClassName =
  | "Cleric"
  | "Dwarf"
  | "Elf"
  | "Fighter"
  | "Halfling"
  | "Magic-User"
  | "Thief";

/** Definition shape for an OSE character class. */
export type OseClass = {
  name: string;
  abilitiesPack: string;
  spellsPack?: string;
  requirements: Partial<Record<Attribute, number>>;
  levels: {
    xp: number;
    hd: string;
    thac0: number;
    saves: number[];
    spells?: number[];
  }[];
  skillChecks?: Record<string, number>[];
  source: string;
};
