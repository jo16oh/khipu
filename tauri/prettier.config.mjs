/** @type {import('prettier').Config} */
const prettierConfig = {
  plugins: [
    "prettier-plugin-sql",
    "@pandabox/prettier-plugin",
    "@trivago/prettier-plugin-sort-imports",
  ],
};

/** @type {import('prettier-plugin-sql').SqlBaseOptions} */
const prettierPluginSqlConfig = {
  language: "sqlite",
  keywordCase: "upper",
  dataTypeCase: "upper",
  functionCase: "lower",
};

/** @type {import('@trivago/prettier-plugin-sort-imports').PluginConfig} */
const prettierPluginSortImportsConfig = {
  importOrder: [
    "^(react/(.*)$)|^(react$)",
    "<THIRD_PARTY_MODULES>",
    "^../",
    "^[./]",
  ],
};

const config = {
  ...prettierConfig,
  ...prettierPluginSqlConfig,
  ...prettierPluginSortImportsConfig,
};

export default config;
