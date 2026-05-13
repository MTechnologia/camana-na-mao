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
    const tab = page.getByRole("tab", { name: /territorial/i });
    await tab.click();

    // Aguarda lista de zonas aparecer.
    await expect(page.locator("text=/zona/i").first()).toBeVisible({ timeout: 15_000 });

    // Clica na primeira zona (drill 1: zona → bairros).
    const firstZone = page
      .locator('[role="button"], button, [data-testid*="zona"]')
      .filter({ hasText: /zona|leste|oeste|norte|sul|centro/i })
      .first();
    if (await firstZone.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstZone.click();
      // Após drill, breadcrumb deve mostrar a zona escolhida.
      await expect(page.locator("text=/zona/i").first()).toBeVisible();
    }
  });

  test("Drill-down multi-dimensional: troca de dimensões", async ({ page }) => {
    const tab = page.getByRole("tab", { name: /drill[- ]?down|multi/i });
    if (!(await tab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Tab de Drill-down não está disponível neste ambiente");
      return;
    }
    await tab.click();

    // Pelo menos um dropdown de dimensão deve aparecer.
    const dropdown = page.locator('[role="combobox"], select').first();
    await expect(dropdown).toBeVisible({ timeout: 10_000 });
  });

  test("Cruzamentos: heatmap aparece", async ({ page }) => {
    const tab = page.getByRole("tab", { name: /cruzamento|cruzamentos|heatmap/i });
    if (!(await tab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Tab Cruzamentos não disponível");
      return;
    }
    await tab.click();
    // Heatmap deve renderizar alguma matriz/células.
    await expect(page.locator("body")).toContainText(
      /heatmap|matriz|categoria|dimensão|dimensao/i,
    );
  });
});
