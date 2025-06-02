/** @type {import('prettier').Config} */
const prettierConfig = {
  plugins: ["prettier-plugin-sql", "@trivago/prettier-plugin-sort-imports"],
};

/** @type {import('prettier-plugin-sql').SqlBaseOptions} */
const prettierPluginSqlConfig = {
  language: "sqlite",
  keywordCase: "upper",
  dataTypeCase: "upper",
  functionCase: "lower",
};

/** @type {import('@trivago/prettier-plugin-sort-imports').PluginConfig} */
const prettierPluginSortImportsConfig = {};

const config = {
  ...prettierConfig,
  ...prettierPluginSqlConfig,
  ...prettierPluginSortImportsConfig,
};

export default config;
