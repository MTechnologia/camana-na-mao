import { test, expect } from "@playwright/test";
import { e2eLogin } from "./helpers";
import { ensureChatReady } from "./_helpers/chatOrchestratorMock";

/**
 * NREF008 + NREF010 — Alinhamento Onboarding/Home + Unificação da nomenclatura.
 * Os chips de destaque da Home espelham as funcionalidades do onboarding
 * (Relato Urbano → Transporte → Audiências Públicas → Perto de Você) e usam a
 * MESMA nomenclatura/ícones do menu sanduíche e do "Explorar".
 */

async function closeOnboardingIfVisible(page: import("@playwright/test").Page) {
  const close = page.getByRole("button", { name: /Fechar|Pular|Começar|×/i }).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

test.describe("NREF008/010 — Chips da Home alinhados (onboarding + menu)", () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
    await page.goto("/");
    await closeOnboardingIfVisible(page);
    await ensureChatReady(page);
  });

  test("destaques espelham o onboarding e a nomenclatura do menu", async ({ page }, testInfo) => {
    test.setTimeout(60000);

    // 4 destaques na ordem do onboarding, nomenclatura canônica
    await expect(page.getByRole("button", { name: "Relato Urbano" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Transporte" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Audiências Públicas" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Perto de Você" }).first()).toBeVisible();

    await page.waitForTimeout(300);
    await page.screenshot({
      path: `test-results/nref008-010/${testInfo.project.name}-chips.png`,
      fullPage: true,
    });

    // "Ver todos" → nomenclatura padronizada (mesma do menu)
    await page.getByRole("button", { name: /Ver todos/i }).first().click();
    await expect(page.getByText("Conheça a Câmara").first()).toBeVisible();
    await expect(page.getByText("Agenda da Câmara").first()).toBeVisible();
    await expect(page.getByText("Notícias", { exact: true }).first()).toBeVisible();

    await page.waitForTimeout(300);
    await page.screenshot({
      path: `test-results/nref008-010/${testInfo.project.name}-vertodos.png`,
      fullPage: true,
    });
  });
});
