// eslint.config.mjs
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error"
    }
  }
];

