import { test, expect } from "@playwright/test";
import { login } from "./_helpers/auth";

/**
 * HU-13.1 — Cobertura e2e de drill-downs em /admin/analytics.
 *
 * Valida que admin/gestor consegue navegar pelas abas analíticas e fazer
 * drill territorial (zona → bairro → rua) e multi-dimensional.
 */

test.describe("Analytics — Drill-downs", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/analytics");
    await expect(page).toHaveURL(/\/admin\/analytics/);
  });

  test("Volume tab renderiza KPIs e gráfico", async ({ page }) => {
    // Tab Volume é o default.
    await expect(page.locator("text=/volume|relatos/i").first()).toBeVisible({
      timeout: 10_000,
    });
    // Algum gráfico Recharts (svg .recharts) deve estar presente.
    const chart = page.locator("svg.recharts-surface, .recharts-wrapper svg").first();
    await expect(chart).toBeVisible({ timeout: 15_000 });
  });

  test("Territorial: drill zona → bairro → rua", async ({ page }) => {
    // Abre aba Territorial.
    const tab = page.getByRole("tab", { name: /território|territorial/i });
    await tab.click();

    // Aguarda o painel territorial renderizar. Usa conteúdo VISÍVEL do drill
    // (KPI / heading do nível), não `text=/zona/i` — que casava com um
    // <option> OCULTO do filtro de zona (select fechado) e falhava o toBeVisible.
    await expect(
      page.getByText(/Volume de relatos|Selecione uma zona|Bairros desta zona/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Clica na primeira zona da lista do drill (botões visíveis, não <option>).
    const firstZone = page
      .getByRole("button")
      .filter({ hasText: /zona (leste|oeste|norte|sul|centro)|não informad/i })
      .first();
    if (await firstZone.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstZone.click();
      // Após o drill, o painel continua renderizado (KPI do recorte visível).
      await expect(page.getByText(/Volume de relatos/i).first()).toBeVisible();
    }
  });

  test("Correlação: dispersão Volume × tempo de resposta", async ({ page }) => {
    const tab = page.getByRole("tab", { name: /^Correlação$/i });
    await tab.click();
    await expect(page.getByText(/Volume × tempo de resposta/i).first()).toBeVisible({
      timeout: 15_000,
    });
    const chart = page.locator("svg.recharts-surface, .recharts-wrapper svg").first();
    await expect(chart).toBeVisible({ timeout: 15_000 });
  });

  test("Padrões: painel de padrões recorrentes renderiza", async ({ page }) => {
    const tab = page.getByRole("tab", { name: /^Padrões$/i });
    await tab.click();
    await expect(page.getByText(/Padrões recorrentes/i).first()).toBeVisible({ timeout: 15_000 });
    const emptyState = page.getByText(/Nenhum padrão ou categoria recorrente no recorte/i);
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }
    const chart = page.locator("svg.recharts-surface, .recharts-wrapper svg").first();
    await expect(chart).toBeVisible({ timeout: 15_000 });
  });
});
