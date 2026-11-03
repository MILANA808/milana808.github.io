const js = require("@eslint/js");

module.exports = [
  { ignores: ["**/node_modules/**", "**/dist/**"] },
  js.configs.recommended,
  {
    files: ["modules/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        globalThis: "readonly",
        Error: "readonly",
        Map: "readonly",
        Number: "readonly",
        Promise: "readonly",
        String: "readonly",
        TypeError: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  }
];
