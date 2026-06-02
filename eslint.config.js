import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  // Artefatos gerados (build/PWA/coverage) e código Deno (supabase/functions)
  // ficam fora do ESLint do Node. As Edge Functions são Deno: têm runtime,
  // globais e diretivas próprias (`deno-lint-ignore`) e são lintadas por
  // `deno lint` (rodado em test:chatbot) — não por este config.
  { ignores: ["dist", "dev-dist", "coverage", "supabase/functions", "**/index-fixed.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  eslintConfigPrettier,
);
