import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", ".vite/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        Buffer: "readonly",
        process: "readonly",
        URL: "readonly",
        RequestInit: "readonly",
        fetch: "readonly",
        window: "readonly",
        document: "readonly",
        IntersectionObserver: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]
    }
  }
];
