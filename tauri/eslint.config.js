import js from "@eslint/js";
import json from "@eslint/json";
import panda from "@pandacss/eslint-plugin";
import pluginQuery from "@tanstack/eslint-plugin-query";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["src/generated/**/*"]),
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  eslintConfigPrettier,
  pluginReact.configs.flat.recommended,
  {
    rules: {
      "react/self-closing-comp": [
        "warn",
        {
          component: true,
          html: true,
        },
      ],
    },
  },
  reactHooks.configs["recommended-latest"],
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
    },
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.jsonc"],
    plugins: { json },
    language: "json/jsonc",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.json5"],
    plugins: { json },
    language: "json/json5",
    extends: ["json/recommended"],
  },
  {
    plugins: {
      "@pandacss": panda,
    },
    rules: {
      ...panda.configs.recommended.rules,
      "@pandacss/prefer-shorthand-properties": "warn",
      "@pandacss/no-margin-properties": "warn",
    },
  },
  {
    plugins: {
      "@tanstack/query": pluginQuery,
    },
    rules: {
      ...pluginQuery.configs.recommended.rules,
    },
  },
]);
