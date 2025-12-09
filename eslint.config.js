import js from "@eslint/js";
import react from "eslint-plugin-react";
import unusedImports from "eslint-plugin-unused-imports";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react,
      "unused-imports": unusedImports
    },
    rules: {
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_"
        }
      ],
      "react/react-in-jsx-scope": "off"
    }
  }
];
