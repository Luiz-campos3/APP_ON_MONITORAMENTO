// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // dist é build; .expo é gerado pelo CLI (typed routes) e não é código nosso.
    ignores: ["dist/*", ".expo/*"],
  },
  {
    // Scripts de manutenção rodam no Node em CommonJS (require/__dirname).
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
      },
    },
  },
]);
