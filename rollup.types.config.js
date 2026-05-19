/**
 * @file Bundles the tsc-emitted declaration tree into a single, tree-shaken
 * `dist-types/index.d.ts` for the @ose-foundry-core/types package.
 *
 * Run after `tsc -p tsconfig.types.json` (see the `build:types` script).
 * rollup-plugin-dts v4 is pinned for Rollup 2 / TypeScript 4 compatibility.
 *
 * The surface is self-contained (no Foundry imports), so the bundle has no
 * external dependencies.
 */
import dts from "rollup-plugin-dts";

export default {
  input: ".types-build/index.d.ts",
  output: {
    file: "dist-types/index.d.ts",
    format: "es",
  },
  plugins: [dts()],
};
