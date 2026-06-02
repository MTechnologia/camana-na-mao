import { test, expect } from "@playwright/test";
import { login } from "./_helpers/auth";

/**
 * A3.2 — Verifica os redirects legados de /admin (App.tsx → "Redirects legados").
 *
 * Cada rota antiga deve levar (replace) ao destino canônico atual. Observação:
 * o código redireciona DIRETO ao destino final (ex.: /admin/reports-analytics →
 * /admin/analytics), sem encadear por /admin/analytics/general (que é, ele
 * próprio, um redirect legado → /admin/analytics). Evita corrente de redirects.
 *
 * Precisa de sessão admin (ProtectedAdminRoute manda não-admin para "/"). Usa o
 * fallback E2E_TEST_* do helper de login quando E2E_ADMIN_* não está definido.
 */

interface LegacyRedirect {
  from: string;
  toPath: string;
  /** Trecho esperado na query string do destino, quando houver. */
  query?: string;
}

const REDIRECTS: LegacyRedirect[] = [
  { from: "/admin/executive", toPath: "/admin" },
  { from: "/admin/reports-analytics", toPath: "/admin/analytics" },
  { from: "/admin/analytics/general", toPath: "/admin/analytics" },
  { from: "/admin/analytics/demograficos", toPath: "/admin/analytics" },
  { from: "/admin/analytics/advanced", toPath: "/admin/analytics" },
  { from: "/admin/sentiment-analysis", toPath: "/admin/analytics" },
  { from: "/admin/padroes", toPath: "/admin/analytics" },
  { from: "/admin/previsoes", toPath: "/admin/analytics" },
  { from: "/admin/anomalias", toPath: "/admin/analytics" },
  { from: "/admin/comissions", toPath: "/admin/commissions" },
  { from: "/admin/configuracoes/agendamentos", toPath: "/admin/exports" },
  { from: "/admin/docs", toPath: "/admin/docs/overview" },
  {
    from: "/admin/avaliacoes-polarizacao",
    toPath: "/admin/reports-heatmap",
    query: "metric=avaliacoes",
  },
  {
    from: "/admin/intensidade-demanda",
    toPath: "/admin/reports-heatmap",
    query: "metric=demanda",
  },
];

test.describe("A3.2 — redirects legados de admin", () => {
  test.setTimeout(3 * 60 * 1000);

  test("cada rota legada redireciona ao destino canônico", async ({ page }) => {
    await login(page, "admin");

    const failures: string[] = [];
    for (const r of REDIRECTS) {
      await page.goto(r.from);
      try {
        await page.waitForURL(
          (url) => {
            if (url.pathname !== r.toPath) return false;
            if (r.query) return url.search.includes(r.query);
            return true;
          },
          { timeout: 8000 },
        );
      } catch {
        failures.push(
          `${r.from} → esperado ${r.toPath}${r.query ? `?${r.query}` : ""}, obtido ${page.url()}`,
        );
      }
    }

    expect(failures, `\nRedirects incorretos:\n${failures.join("\n")}`).toEqual([]);
  });
});
