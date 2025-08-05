/** @type {import('stylelint').Config} */
export default {
  plugins: [
    "@stylistic/stylelint-plugin",
    "stylelint-declaration-strict-value",
  ],
  extends: [
    "stylelint-config-standard",
    "stylelint-config-recess-order",
    "stylelint-declaration-block-no-ignored-properties",
    "@stylistic/stylelint-config",
  ],
  rules: {
    "selector-max-class": 1,
    "selector-max-id": 0,
    "scale-unlimited/declaration-strict-value": [
      ["/color$/", "fill", "stroke"],
      {
        "expandShorthand": true,
        ignoreKeywords: ["currentColor", "transparent", "inherit"],
        disableFix: true,
      },
    ],
    "unit-disallowed-list": [["px"], {
      "ignoreFunctions": ["calc", "/^translate/"],
      "ignoreMediaFeatureNames": {
        "px": ["min-width", "/height$/"],
      },
    }],
  },
  ignoreFiles: ["src/generated/**/*"],
};
