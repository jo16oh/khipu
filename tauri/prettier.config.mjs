/** @type {import('prettier').Config} */
const prettierConfig = {
  plugins: ["prettier-plugin-sql", "@pandabox/prettier-plugin"],
};

/** @type {import('prettier-plugin-sql').SqlBaseOptions} */
const prettierPluginSqlConfig = {
  language: "sqlite",
  keywordCase: "upper",
  dataTypeCase: "upper",
  functionCase: "lower",
};

const config = {
  ...prettierConfig,
  ...prettierPluginSqlConfig,
};

export default config;
