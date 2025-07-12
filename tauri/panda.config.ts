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
    ".ProseMirror": {
      position: "relative",
      wordWrap: "break-word",
      whiteSpace: "break-spaces",
      WebkitFontVariantLigatures: "none",
      fontVariantLigatures: "none",
      fontFeatureSettings: '"liga" 0',
    },
    ".ProseMirror pre": {
      whiteSpace: "pre-wrap",
    },
    ".ProseMirror li": {
      position: "relative",
    },
    ".ProseMirror-hideselection *::selection": {
      background: "transparent",
    },
    ".ProseMirror-hideselection *::-moz-selection": {
      background: "transparent",
    },
    ".ProseMirror-hideselection": {
      caretColor: "transparent",
    },
    ".ProseMirror [draggable][contenteditable=false]": {
      userSelect: "text",
    },
    ".ProseMirror-selectednode": {
      outline: "2px solid #8cf",
    },
    "li.ProseMirror-selectednode": {
      outline: "none",
    },
    "li.ProseMirror-selectednode:after": {
      content: '""',
      position: "absolute",
      left: "-32px",
      right: "-2px",
      top: "-2px",
      bottom: "-2px",
      border: "2px solid #8cf",
      pointerEvents: "none",
    },
    "img.ProseMirror-separator": {
      display: "inline !important",
      border: "none !important",
      margin: "0 !important",
    },
  },
});
