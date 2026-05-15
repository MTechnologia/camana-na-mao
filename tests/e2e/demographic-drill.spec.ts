import { expect, test } from "@playwright/test";
import { login } from "./_helpers/auth";

/**
 * Verifica drill-down na aba Demografia (gráficos de pizza).
 * Requer .env.e2e.local com admin e migração get_demographic_drill_reports aplicada
 * (ou policy Staff em user_demographics).
 */
test.describe("Drill-down demográfico", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/analytics/demograficos");
    await expect(page.getByRole("heading", { name: /demográficos/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("clique em Feminino abre painel com relatos", async ({ page }) => {
    const slice = page.locator(".recharts-pie-sector").filter({ has: page.locator("..") }).first();
    // Clica na fatia do gráfico "Por Gênero" (primeiro pie da página)
    await page.locator(".recharts-pie-sector").first().click({ force: true });

    const panel = page.getByText(/Gênero:/i).first();
    await expect(panel).toBeVisible({ timeout: 10_000 });

    const countText = page.getByText(/\d+ relatos encontrados/i).first();
    await expect(countText).toBeVisible();
    const text = await countText.textContent();
    const n = Number(text?.match(/(\d+)/)?.[1] ?? "0");
    expect(n).toBeGreaterThan(0);
  });
});
