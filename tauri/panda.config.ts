import { defineConfig } from "@pandacss/dev";
import pandaPreset from "@pandacss/preset-panda";
import pandaAnimate from "pandacss-animate";

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [".src/generated/**/*"],

  // Useful for theme customization
  theme: {
    extend: {},
  },

  presets: [pandaPreset, pandaAnimate],

  // The output directory for your css system
  outdir: "src/generated/styled-system",

  jsxFramework: "react",
});
