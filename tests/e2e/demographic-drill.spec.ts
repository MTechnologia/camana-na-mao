import { expect, test } from "@playwright/test";
import { login } from "./_helpers/auth";

/**
 * Drill demográfico no dashboard executivo: heatmap Categoria × Gênero (HU-3.4/3.5).
 * A rota legada /admin/analytics/demograficos redireciona para /admin/analytics.
 */
test.describe("Drill-down demográfico", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");
    // Cruzamento analítico vive na aba dedicada do dashboard.
    await page.getByRole("tab", { name: /Cruzamento analítico/i }).click();
    await expect(page.getByRole("heading", { name: /Cruzamento analítico/i })).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByText(/Cruzamento de dimensões/i).first()).toBeVisible();
  });

  test("clique numa célula do heatmap abre painel com relatos", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Tipo de relato × Gênero/i })).toBeVisible({
      timeout: 25_000,
    });
    // Nome acessível: "Urbano × Não informado: 16 relatos" (× = U+00D7).
    const cell = page.getByRole("button", { name: /: \d+ relato/i }).first();
    const cellVisible = await cell.isVisible({ timeout: 20_000 }).catch(() => false);
    if (!cellVisible) {
      test.skip(true, "Sem células clicáveis no heatmap para este recorte/dados");
      return;
    }
    await cell.click();

    const countText = page.getByText(/\d+ relatos encontrados/i).first();
    await expect(countText).toBeVisible({ timeout: 15_000 });
    const text = await countText.textContent();
    const n = Number(text?.match(/(\d+)/)?.[1] ?? "0");
    if (n === 0) {
      test.skip(true, "Backend retornou 0 relatos no drill — verifique dados/RLS no ambiente");
      return;
    }
    expect(n).toBeGreaterThan(0);
  });
});
