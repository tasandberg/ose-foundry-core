/**
 * @file Bundles the tsc-emitted declaration tree into a single, tree-shaken
 * `dist-types/index.d.ts` for the @ose-foundry-core/types package.
 *
 * Run after `tsc -p tsconfig.types.json` (see the `build:types` script).
 *
 * The shipped declarations reference Foundry's global `Actor` and `Item`
 * types, so we emit a triple-slash directive at the top of the bundle that
 * auto-loads the peer dependency in any consumer with a sensible TS setup.
 */
import dts from "rollup-plugin-dts";

export default {
  input: ".types-build/index.d.ts",
  output: {
    file: "dist-types/index.d.ts",
    format: "es",
    banner:
      '/// <reference types="@league-of-foundry-developers/foundry-vtt-types" />',
  },
  // The Foundry types are a peer dependency — never inline them into our bundle.
  external: [/foundry-vtt-types/],
  plugins: [dts({ respectExternal: false })],
};
