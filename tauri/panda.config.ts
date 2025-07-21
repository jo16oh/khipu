import { defineConfig } from "@pandacss/dev";
import pandaPreset from "@pandacss/preset-panda";
import pandaAnimate from "pandacss-animate";
import { defaultProseMirrorStyle, editorStyle } from "./src/editor/style";

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [".src/generated/**/*"],

  // Useful for theme customization
  theme: {
    extend: {
      tokens: {
        fontSizes: {
          h1: { value: "1.75rem" },
          h2: { value: "1.6rem" },
          h3: { value: "1.45rem" },
          h4: { value: "1.3rem" },
          h5: { value: "1.15rem" },
          h6: { value: "1rem" },
        },
      },
    },
  },

  presets: [pandaPreset, pandaAnimate],

  // The output directory for your css system
  outdir: "src/generated/styled-system",

  jsxFramework: "react",

  strictTokens: true,
  strictPropertyValues: true,

  globalCss: {
    "html, body": {
      cursor: "default",
      fontSmoothing: "subpixel-antialiased",
      userSelect: "none",
      overscrollBehavior: "none",
      color: "stone.900",
    },
    ...defaultProseMirrorStyle,
    ...editorStyle,
  },
});
