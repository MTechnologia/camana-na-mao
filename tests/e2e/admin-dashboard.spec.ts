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

    // Dashboard executivo — KPIs oficiais (Volume, tempo de resposta, etc.).
    await expect(page.getByRole("heading", { name: /Indicadores principais/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("body")).toContainText(/Volume de relatos|Indicadores principais/i);

    // Barra unificada em /admin — o `AdminLiveIndicator` não entra no nome acessível do `role=status`.
    const liveIndicator = page.locator('[role="status"]').filter({ hasText: /Ao vivo/i }).first();
    await expect(liveIndicator).toBeVisible({ timeout: 10_000 });
  });

  test("admin acessa sidebar com itens de gestão", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");

    const openMenu = page.getByRole("button", { name: "Abrir menu" });
    if (await openMenu.isVisible().catch(() => false)) {
      await openMenu.click();
    }

    // Sidebar: grupos recolhidos não expõem itens ao `innerText` — abrir "Relatos urbanos".
    const sidebar = page.getByRole("complementary", { name: /Menu principal/i });
    await expect(sidebar).toContainText(/Análise institucional|Dashboard executivo/i);
    const relatosGroup = sidebar.getByRole("button", { name: /^Relatos urbanos$/i });
    if (await relatosGroup.isVisible().catch(() => false)) {
      await sidebar.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await relatosGroup.scrollIntoViewIfNeeded();
      try {
        await relatosGroup.click({ timeout: 5_000 });
      } catch {
        await relatosGroup.evaluate((n) => (n as HTMLElement).click());
      }
    }
    await expect(sidebar.getByRole("link", { name: /Gestão de relatos/i })).toBeVisible();
    // Kanban exige permissão `triage.view_kanban` — nem todo utilizador "admin" e2e a tem.
    const kanbanLink = sidebar.getByRole("link", { name: /Kanban de triagem/i });
    if (await kanbanLink.isVisible().catch(() => false)) {
      await expect(kanbanLink).toBeVisible();
    } else {
      await expect(sidebar.getByRole("link", { name: /Análise de encaminhamentos/i })).toBeVisible();
    }
    await expect(sidebar).toContainText(/Análise de relatos urbanos/i);
  });

  test("admin: seção de cruzamento analítico renderiza", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");

    // Cruzamento analítico vive na aba dedicada do dashboard.
    await page.getByRole("tab", { name: /Cruzamento analítico/i }).click();

    await expect(page.getByRole("heading", { name: /Cruzamento analítico/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Cruzamento de dimensões/i).first()).toBeVisible();
  });
});
