import { test, expect } from "@playwright/test";
import { login } from "./_helpers/auth";

/**
 * HU-13.1 — Cobertura e2e do dashboard admin.
 *
 * Valida que admin consegue acessar /admin, vê os KPIs principais e o
 * indicador "Ao vivo" (realtime) está presente.
 */

test.describe("Admin Dashboard", () => {
  test("admin vê KPIs e live indicator na home /admin", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/?$/);

    // KPIs consolidados — devem aparecer (totais, ativos, etc).
    await expect(page.locator("body")).toContainText(/Total|Ativos|Pendentes/i);

    // Live indicator presente (badge/label "ao vivo" ou similar).
    const liveIndicator = page.locator("text=/ao vivo|live|tempo real/i").first();
    await expect(liveIndicator).toBeVisible({ timeout: 10_000 });
  });

  test("admin acessa sidebar com itens de gestão", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");

    // Sidebar deve mostrar Relatos, Análise de Relatos, Triagem, etc.
    const sidebar = page.locator("aside, nav").first();
    await expect(sidebar).toContainText(/Relatos/i);
    await expect(sidebar).toContainText(/Análise|Análise de Relatos/i);
    await expect(sidebar).toContainText(/Triagem/i);
  });

  test("admin: feed de atividade recente renderiza", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");

    // O feed deve estar visível (mesmo vazio mostra placeholder).
    const feed = page.locator(
      'text=/atividade recente|últimos relatos|sem atividade/i',
    );
    await expect(feed.first()).toBeVisible({ timeout: 10_000 });
  });
});
