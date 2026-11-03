const js = require("@eslint/js");

module.exports = [
  { ignores: ["**/node_modules/**", "**/dist/**"] },
  js.configs.recommended,
  {
    files: ["modules/**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        globalThis: "readonly",
        module: "readonly",
        Date: "readonly",
        TextEncoder: "readonly",
        Uint8Array: "readonly",
        Array: "readonly",
        Boolean: "readonly",
        JSON: "readonly",
        Math: "readonly",
        Object: "readonly",
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
