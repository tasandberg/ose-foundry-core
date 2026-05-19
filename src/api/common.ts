/**
 * @file Shared building-block types used across the public OSE type surface.
 *
 * These mirror the runtime schemas defined in the system's `defineSchema()`
 * calls and `template.json`. They are intentionally hand-authored: the data
 * shapes are not expressed anywhere in the system's own TypeScript, so this
 * module is the single hand-maintained source for external consumers.
 */

/**
 * A single tag attached to an Item (weapon/armor/spell/ability/etc.).
 *
 * Stored as `tags: ArrayField(ObjectField())` on the relevant data models.
 * `value` is always present; `title`/`label` are populated by the system's
 * derived tag getters.
 */
export interface Tag {
  value: string;
  title?: string;
  label?: string;
}

/**
 * A tag produced by the system's automatic tag getters
 * (`item.system.autoTags`). Shape varies by item type.
 */
export interface DerivedTag {
  label?: string;
  title?: string;
  icon?: string;
  image?: string;
}

/** A `{ value, max }` counter pair (quantities, weapon counters, …). */
export interface ValueMax {
  value: number;
  max: number;
}
