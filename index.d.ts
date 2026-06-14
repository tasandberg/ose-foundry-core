/// <reference types="@league-of-foundry-developers/foundry-vtt-types" />
/**
 * @file A class to handle the nested AC/AAC props on OseDataModelCharacter.
 */
/**
 * A character's armour class, broken into its component parts. Which numbering
 * convention `base` follows depends on whether ascending or descending AC is in
 * use for the world.
 */
interface CharacterAC {
    /** Starting AC before armour, shield, or modifiers are applied. */
    readonly base: number;
    /** AC with no armour or shield equipped. */
    readonly naked: number;
    /** Bonus contributed by an equipped shield, if any. */
    readonly shield: number;
    /** Effective armour class, combining armour, shield, and modifiers. */
    value: number;
    /** Miscellaneous flat modifier applied to AC. */
    mod: number;
}

/**
 * @file The base class for all encumbrance schemes. Feel free to extend this to make your own schemes!
 */
/**
 * A character's carrying load under the active encumbrance scheme. The
 * breakpoint flags and `steps` are only meaningful for variants that impose
 * movement penalties as weight increases.
 */
interface CharacterEncumbrance {
    /** Identifier of the active encumbrance scheme (e.g. `"disabled"`, `"basic"`, `"detailed"`, `"complete"`). */
    readonly variant: string;
    /** Whether encumbrance is being tracked for this character. */
    readonly enabled: boolean;
    /** Carried weight as a percentage (0–100) of `max`. */
    readonly pct: number;
    /** Whether the character is carrying more than their limit. */
    readonly encumbered: boolean;
    /** Weight thresholds, as percentages of `max`, at which movement penalties take effect. */
    readonly steps: number[];
    /** Total weight currently carried. */
    readonly value: number;
    /** Maximum weight the character can carry. */
    max: number;
    /** Whether carried weight has reached the first movement-penalty threshold; `null` when the active variant defines none. */
    readonly atFirstBreakpoint: boolean | null;
    /** Whether carried weight has reached the second movement-penalty threshold; `null` when the active variant defines none. */
    readonly atSecondBreakpoint: boolean | null;
    /** Whether carried weight has reached the third movement-penalty threshold; `null` when the active variant defines none. */
    readonly atThirdBreakpoint: boolean | null;
}
/**
 * A class to handle character encumbrance.
 */
declare class OseDataModelCharacterEncumbrance implements CharacterEncumbrance {
    #private;
    static baseEncumbranceCap: number;
    static encumbranceSteps: {
        quarter: number;
        threeEighths: number;
        half: number;
    };
    /**
     * The constructor
     *
     * @param {string} variant - The name of this encumbrance variant.
     * @param {number} max - The max weight this character can carry
     * @param {Item[]} items - The items this character is carrying. Note: we're not using this in the base class.
     */
    constructor(variant?: string, max?: number);
    static defineSchema(): any;
    get variant(): string;
    get enabled(): boolean;
    get pct(): number;
    get encumbered(): boolean;
    get steps(): number[];
    get value(): number;
    get max(): number;
    set max(value: number);
    get atThirdBreakpoint(): boolean;
    get atSecondBreakpoint(): boolean;
    get atFirstBreakpoint(): boolean;
    get defaultMax(): number;
    get alternateMax(): number;
}

/**
 * @file A class representing the character's ability to move, depending on encumbrance state
 */

/**
 * A character's movement rates, derived from their base speed and current
 * encumbrance. When auto-calculation is enabled, `base` is computed from the
 * encumbrance variant; otherwise it is the manually entered rate.
 */
interface CharacterMove {
    /** Base (exploration) movement rate, in feet per turn. Defaults to 120. */
    base: number;
    /** Encounter (combat) movement rate, in feet per round — derived as `base / 3`. */
    readonly encounter: number;
    /** Overland (travel) movement rate, in miles per day — derived as `base / 5`. */
    readonly overland: number;
}

/**
 * @file A class representing a Character's ability scores.
 */
/** A raw ability score as supplied, before its modifier is derived. */
type IncomingScore = {
    /** The ability score itself (typically 3–18). */
    value: number;
    /** Flat bonus applied to the score, separate from the derived modifier. */
    bonus: number;
};
/** An ability score together with its derived modifier. */
type BaseScore = IncomingScore & {
    /** Derived ability modifier (−3 to +3), looked up from `value`. */
    mod: number;
};
/**
 * A character's six ability scores. Each ability carries its raw value, bonus,
 * and derived modifier; some abilities also expose extra values computed from
 * that score (open-doors chance, literacy/languages, initiative, and the
 * Charisma-driven retainer stats).
 */
interface CharacterScores {
    /** Strength, plus the character's open-doors chance. */
    str: BaseScore & {
        /** Chance (in 6) to force open a stuck door, derived from Strength. */
        od: number;
    };
    /** Intelligence, plus derived literacy and spoken-language information. */
    int: BaseScore & {
        /** Localization key describing the character's literacy level. */
        literacy: string;
        /** Localization key describing how many languages the character speaks. */
        spoken: string;
    };
    /** Wisdom. */
    wis: BaseScore;
    /** Dexterity, plus its contribution to initiative. */
    dex: BaseScore & {
        /** Initiative modifier derived from Dexterity. */
        init: number;
    };
    /** Constitution. */
    con: BaseScore;
    /** Charisma, plus its retainer-related values. */
    cha: BaseScore & {
        /** Loyalty rating of the character's retainers, derived from Charisma. */
        loyalty: number;
        /** Maximum number of retainers the character can employ, derived from Charisma. */
        retain: number;
        /** Modifier to NPC reaction rolls, derived from Charisma. */
        npc: number;
    };
}

/**
 * @file A class representing a creature's spellcasting abilities
 */
/** Slot usage for a single spell level. */
type Slot = {
    /** Number of slots already expended at this spell level. */
    used: number;
    /** Total slots available at this spell level. */
    max: number;
};
/** Spell slots, keyed by spell level. */
type Slots = Record<number, Slot>;
/** Spells grouped by spell level. */
type Spells = Record<number, Item[]>;
/**
 * A character's spellcasting state — whether they cast at all, the spells they
 * have grouped by level, and how many slots they have used per level.
 */
interface CharacterSpells {
    /** Whether the character can cast spells. */
    enabled: boolean;
    /** The character's spells, grouped by spell level. */
    readonly spellList: Spells;
    /** Slot usage per spell level. */
    readonly slots: Slots;
}

/**
 * @file A class representing the "Basic" encumbrance scheme from Old School Essentials: Classic Fantasy
 */

/**
 * A set of options for configuring the
 * Basic encumbrance scheme
 */
type Options = {
    significantTreasure: number;
};
/**
 * @todo Add template path for encumbrance bar
 * @todo Add template path for inventory item row
 */
declare class OseDataModelCharacterEncumbranceBasic extends OseDataModelCharacterEncumbrance implements CharacterEncumbrance {
    #private;
    static templateEncumbranceBar: string;
    static templateInventoryRow: string;
    /**
     * The machine-readable label for this encumbrance scheme
     */
    static type: string;
    /**
     * The human-readable label for this encumbrance scheme
     */
    static localizedLabel: string;
    /**
     * The base value for the amount of treasure that slows a character down
     */
    static significantTreasure: number;
    /**
     * A map of strings to numbers indicating how heavy a set of armor is.
     * The heavier the armor, the slower you move.
     */
    static armorWeight: {
        unarmored: number;
        light: number;
        heavy: number;
    };
    constructor(max?: number, items?: Item[], options?: Options);
    static defineSchema(): any;
    get steps(): number[];
    get overTreasureThreshold(): boolean;
    get value(): number;
    get overSignificantTreasureThreshold(): boolean;
    get atThirdBreakpoint(): boolean;
    get atSecondBreakpoint(): boolean;
    get atFirstBreakpoint(): boolean;
}

/**
 * @file A class representing the "Complete" encumbrance scheme from Old School Essentials: Classic Fantasy
 */

/**
 * @todo Add template path for encumbrance bar
 * @todo Add template path for inventory item row
 */
declare class OseDataModelCharacterEncumbranceComplete extends OseDataModelCharacterEncumbrance implements CharacterEncumbrance {
    #private;
    static templateEncumbranceBar: string;
    static templateInventoryRow: string;
    /**
     * The machine-readable label for this encumbrance scheme
     */
    static type: string;
    /**
     * The human-readable label for this encumbrance scheme
     */
    static localizedLabel: string;
    constructor(max?: number, items?: Item[]);
    static defineSchema(): any;
    get steps(): number[];
    get value(): number;
}

/**
 * @file A class representing the "Detailed" encumbrance scheme from Old School Essentials: Classic Fantasy
 */

/**
 * @todo Add template path for encumbrance bar
 * @todo Add template path for inventory item row
 */
declare class OseDataModelCharacterEncumbranceDetailed extends OseDataModelCharacterEncumbrance implements CharacterEncumbrance {
    #private;
    static templateEncumbranceBar: string;
    static templateInventoryRow: string;
    /**
     * The machine-readable label for this encumbrance scheme
     */
    static type: string;
    /**
     * The human-readable label for this encumbrance scheme
     */
    static localizedLabel: string;
    /**
     * The weight (in coins) to add to the total weight value if the character has adventuring gear
     */
    static gearWeight: number;
    constructor(max?: number, items?: Item[]);
    static defineSchema(): any;
    get steps(): number[];
    get value(): number;
}

/**
 * @file A class representing the "Disabled" encumbrance scheme;
 *       we aren't tracking carry weight here.
 */

/**
 * @todo Add template path for encumbrance bar
 * @todo Add template path for inventory item row
 */
declare class OseDataModelCharacterEncumbranceDisabled extends OseDataModelCharacterEncumbrance implements CharacterEncumbrance {
    static templateEncumbranceBar: string;
    static templateInventoryRow: string;
    /**
     * The machine-readable label for this encumbrance scheme
     */
    static type: string;
    /**
     * The human-readable label for this encumbrance scheme
     */
    static localizedLabel: string;
    constructor();
    static defineSchema(): any;
    get value(): number;
}

/**
 * @file A class representing the "Item-based" encumbrance scheme from Carcass Crawler Issue Two
 */

/**
 * @todo Add template path for encumbrance bar
 * @todo Add template path for inventory item row
 */
declare class OseDataModelCharacterEncumbranceItemBased extends OseDataModelCharacterEncumbrance implements CharacterEncumbrance {
    #private;
    static baseEncumbranceCap: number;
    static alternateBaseEncumbranceCap: number;
    static packedEncumbranceSteps: {
        fiveEighths: number;
        threeQuarters: number;
        sevenEighths: number;
    };
    static packedStepCounts: {
        stepOne: number;
        stepTwo: number;
        stepThree: number;
    };
    static equippedEncumbranceSteps: {
        oneThird: number;
        fiveNinths: number;
        sevenNinths: number;
    };
    static equippedStepCounts: {
        stepOne: number;
        stepTwo: number;
        stepThree: number;
    };
    static templateEncumbranceBar: string;
    static templateInventoryRow: string;
    /**
     * The machine-readable label for this encumbrance scheme
     */
    static type: string;
    /**
     * The human-readable label for this encumbrance scheme
     */
    static localizedLabel: string;
    constructor(max?: number, items?: Item[], options?: {
        scores?: {
            str?: {
                mod?: number;
            };
        };
    });
    static defineSchema(): any;
    get steps(): number[];
    get usingEquippedEncumbrance(): boolean;
    get value(): number;
    get max(): number;
    get atFirstBreakpoint(): boolean;
    get atSecondBreakpoint(): boolean;
    get atThirdBreakpoint(): boolean;
    get encumbered(): boolean;
    get equippedSteps(): number[];
    get packedSteps(): number[];
    get equippedPct(): number;
    get packedPct(): number;
    get equippedValue(): number;
    get packedValue(): number;
    get equippedLabel(): string;
    get packedLabel(): string;
    get alternateMax(): number;
}

/**
 * The shape of the system's global configuration object, `OSE` (exposed at
 * runtime as `CONFIG.OSE`). Most string values are localization keys to be
 * passed through `game.i18n`, not display text. Several derived unions below
 * (e.g. {@link Save}, {@link Attribute}) are keyed off this shape.
 */
type OseConfig = typeof OSE;
/** An ability-score key: `str`, `int`, `wis`, `dex`, `con`, or `cha`. */
type Attribute = keyof OseConfig["scores"];
/** A dungeon-exploration skill key (e.g. listen at doors, open doors, find secret doors). */
type ExplorationSkill = keyof OseConfig["exploration_skills"];
/** How a roll is compared against its target: exact result, at or above, or at or below. */
type RollType = keyof OseConfig["roll_type"];
/** A saving-throw category key: `death`, `wand`, `paralysis`, `breath`, or `spell`. */
type Save = keyof OseConfig["saves_long"];
/** An armour category key: `unarmored`, `light`, `heavy`, or `shield`. */
type Armor = keyof OseConfig["armor"];
/** A UI colour key used by the system's theming. */
type Color = keyof OseConfig["colors"];
/** A weapon/item quality tag key (e.g. `melee`, `missile`, `slow`, `twohanded`). */
type InventoryItemTag = keyof OseConfig["tags"];
/** An encumbrance-scheme key: `basic`, `detailed`, `complete`, `disabled`, or `itembased`. */
type EncumbranceOption = keyof OseConfig["encumbranceOptions"];
/** Which token(s) damage is applied to: the `selected`, the `targeted`, or the `originalTarget`. */
type ApplyDamageOption = keyof OseConfig["apply_damage_options"];
declare const OSE: {
    /** Path for system dist */
    systemPath(): string;
    /** Root path for OSE system */
    readonly systemRoot: string;
    /** Path for system assets */
    readonly assetsPath: string;
    /**
     * The encumbrance scheme currently selected in world settings, resolved to
     * its data-model class. Falls back to the disabled scheme if unset.
     */
    readonly encumbrance: typeof OseDataModelCharacterEncumbranceBasic | typeof OseDataModelCharacterEncumbranceComplete | typeof OseDataModelCharacterEncumbranceDetailed | typeof OseDataModelCharacterEncumbranceDisabled | typeof OseDataModelCharacterEncumbranceItemBased;
    /** Character class definitions, grouped by rules setting (e.g. classic fantasy). */
    classes: {
        classic: Record<ClassicClassName, OseClass>;
    };
    /** The available encumbrance schemes, keyed by setting value to their data-model class. */
    encumbranceOptions: {
        basic: typeof OseDataModelCharacterEncumbranceBasic;
        detailed: typeof OseDataModelCharacterEncumbranceDetailed;
        complete: typeof OseDataModelCharacterEncumbranceComplete;
        disabled: typeof OseDataModelCharacterEncumbranceDisabled;
        itembased: typeof OseDataModelCharacterEncumbranceItemBased;
    };
    /** Full ability-score names, as localization keys, keyed by ability. */
    scores: {
        str: string;
        int: string;
        dex: string;
        wis: string;
        con: string;
        cha: string;
    };
    /** Abbreviated ability-score names, as localization keys, keyed by ability. */
    scores_short: {
        str: string;
        int: string;
        dex: string;
        wis: string;
        con: string;
        cha: string;
    };
    /** Full dungeon-exploration skill names, as localization keys, keyed by skill. */
    exploration_skills: {
        ld: string;
        od: string;
        sd: string;
        fs: string;
    };
    /** Abbreviated dungeon-exploration skill names, as localization keys, keyed by skill. */
    exploration_skills_short: {
        ld: string;
        od: string;
        sd: string;
        fs: string;
    };
    /** Comparison operators shown for a roll's target: equal, at-or-above, at-or-below. */
    roll_type: {
        result: string;
        above: string;
        below: string;
    };
    /** Abbreviated saving-throw names, as localization keys, keyed by save category. */
    saves_short: {
        death: string;
        wand: string;
        paralysis: string;
        breath: string;
        spell: string;
    };
    /** Full saving-throw names, as localization keys, keyed by save category. */
    saves_long: {
        death: string;
        wand: string;
        paralysis: string;
        breath: string;
        spell: string;
    };
    /** Armour category names, as localization keys, keyed by category. */
    armor: {
        unarmored: string;
        light: string;
        heavy: string;
        shield: string;
    };
    /** Targeting modes for applying damage, keyed by mode. */
    apply_damage_options: {
        selected: string;
        targeted: string;
        originalTarget: string;
    };
    /** Named UI colours, as localization keys, keyed by colour. */
    colors: {
        green: string;
        red: string;
        yellow: string;
        purple: string;
        blue: string;
        orange: string;
        white: string;
    };
    /** The languages a character may know, as display names. */
    languages: string[];
    /** Weapon/item quality tag labels, as localization keys, keyed by tag. */
    tags: {
        melee: string;
        missile: string;
        slow: string;
        twohanded: string;
        blunt: string;
        brace: string;
        splash: string;
        reload: string;
        charge: string;
    };
    /** Display metadata (label, image, icon) for each item tag, derived on access. */
    auto_tags: {
        readonly melee: {
            label: string;
            image: string;
            icon: string;
        };
        readonly missile: {
            label: string;
            image: string;
            icon: string;
        };
        readonly slow: {
            label: string;
            image: string;
            icon: string;
        };
        readonly twohanded: {
            label: string;
            image: string;
            icon: string;
        };
        readonly blunt: {
            label: string;
            image: string;
            icon: string;
        };
        readonly brace: {
            label: string;
            image: string;
            icon: string;
        };
        readonly splash: {
            label: string;
            image: string;
            icon: string;
        };
        readonly reload: {
            label: string;
            image: string;
            icon: string;
        };
        readonly charge: {
            label: string;
            image: string;
            icon: string;
        };
    };
    /** Icon/image path for each item tag, derived on access. */
    tag_images: {
        readonly melee: string;
        readonly missile: string;
        readonly slow: string;
        readonly twohanded: string;
        readonly blunt: string;
        readonly brace: string;
        readonly splash: string;
        readonly reload: string;
        readonly charge: string;
    };
    /**
     * Monster saving-throw target numbers, keyed by the minimum Hit Dice for the
     * row, then by save category (`d`/`w`/`p`/`b`/`s`).
     */
    monster_saves: {
        0: {
            d: number;
            w: number;
            p: number;
            b: number;
            s: number;
        };
        1: {
            d: number;
            w: number;
            p: number;
            b: number;
            s: number;
        };
        4: {
            d: number;
            w: number;
            p: number;
            b: number;
            s: number;
        };
        7: {
            d: number;
            w: number;
            p: number;
            b: number;
            s: number;
        };
        10: {
            d: number;
            w: number;
            p: number;
            b: number;
            s: number;
        };
        13: {
            d: number;
            w: number;
            p: number;
            b: number;
            s: number;
        };
        16: {
            d: number;
            w: number;
            p: number;
            b: number;
            s: number;
        };
        19: {
            d: number;
            w: number;
            p: number;
            b: number;
            s: number;
        };
        22: {
            d: number;
            w: number;
            p: number;
            b: number;
            s: number;
        };
    };
    /** Monster THAC0 (attack value), keyed by the minimum Hit Dice for the row. */
    monster_thac0: {
        0: number;
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
        6: number;
        7: number;
        9: number;
        10: number;
        12: number;
        14: number;
        16: number;
        18: number;
        20: number;
        22: number;
    };
};

/**
 * @file Public type definitions for OSE character classes.
 *
 * Canonical home — the system's own `classic-fantasy-classes.ts` data file
 * imports these from here.
 */

/**
 * The seven core classes of classic-fantasy Old-School Essentials: the four
 * human classes (Cleric, Fighter, Magic-User, Thief) and the three demi-human
 * race-as-class options (Dwarf, Elf, Halfling).
 */
type ClassicClassName = "Cleric" | "Dwarf" | "Elf" | "Fighter" | "Halfling" | "Magic-User" | "Thief";
/**
 * Definition shape for an OSE character class.
 *
 * Consumed by the system's `classic-fantasy-classes.ts` data file, which
 * declares each class as a fully-typed `OseClass`. Numeric tables follow
 * Old-School Essentials conventions.
 */
type OseClass = {
    /** Display name of the class (e.g. `"Magic-User"`). */
    name: string;
    /**
     * Compendium pack ID (`<package>.<pack>`) holding the class's special-ability
     * items, e.g. `"classicfantasycompendium.abilities-cleric"`.
     */
    abilitiesPack: string;
    /**
     * Compendium pack ID for the class's spell list. Omitted for non-spellcasting
     * classes (e.g. Fighter, Thief).
     */
    spellsPack?: string;
    /**
     * Minimum ability scores required to take the class, keyed by ability
     * (`str`/`int`/`wis`/`dex`/`con`/`cha`). Abilities with no minimum are absent;
     * an empty `{}` means the class has no ability-score requirement.
     */
    requirements: Partial<Record<Attribute, number>>;
    /**
     * Per-level progression table, indexed by character level minus one
     * (`levels[0]` is level 1, `levels[1]` is level 2, …).
     */
    levels: {
        /** Cumulative experience points required to reach this level. */
        xp: number;
        /** Hit Dice gained by this level, as a dice formula string (e.g. `"2d6"`). */
        hd: string;
        /** THAC0 ("To Hit Armour Class 0") — the class's attack value at this level. */
        thac0: number;
        /**
         * Saving-throw target numbers for this level, in OSE's canonical order:
         * `[death, wand, paralysis, breath, spell]` — i.e. Death/Poison (D), Wands
         * (W), Paralysis/Petrification (P), Breath Attacks (B), Spells/Rods/Staves
         * (S). A roll meeting or exceeding the target succeeds.
         */
        saves: number[];
        /**
         * Spell slots available at this level, indexed by spell level minus one
         * (`spells[0]` is 1st-level slots). Omitted for non-spellcasting classes.
         */
        spells?: number[];
    }[];
    /**
     * Optional per-level skill-check table for skill-based classes (e.g. the
     * Thief). Each entry is one character level's success-chance percentages,
     * keyed by the class's skill abbreviations: `cs` Climb Sheer Surfaces, `tr`
     * Find/Remove Treasure Traps, `hn` Hear Noise, `hs` Hide in Shadows, `ms`
     * Move Silently, `ol` Open Locks, `pp` Pick Pockets.
     */
    skillChecks?: Record<string, number>[];
    /** Source / edition label the class definition comes from (e.g. `"Classic Fantasy"`). */
    source: string;
};

export type { ApplyDamageOption, Armor, Attribute, CharacterAC, CharacterEncumbrance, CharacterMove, CharacterScores, CharacterSpells, ClassicClassName, Color, EncumbranceOption, ExplorationSkill, InventoryItemTag, OseClass, OseConfig, RollType, Save };
