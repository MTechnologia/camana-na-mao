import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: true,
    /**
     * Credenciais dummy para os testes (A1.1): o client Supabase
     * (src/integrations/supabase/client.ts) lança no import se faltar URL/key.
     * Assim a suíte roda sem depender de um Supabase real nem de `.env` presente (CI).
     */
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
      CAMARA_URL: "http://localhost:54321",
      CAMARA_PUBLISHABLE_KEY: "sb_publishable_test_key",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      /** Só ficheiros tocados pelo grafo de testes (evita instrumentar src inteiro e falhar thresholds). */
      all: false,
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/__tests__/**",
        "src/test/**",
        "src/main.tsx",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 75,
        branches: 55,
        statements: 72,
        functions: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
