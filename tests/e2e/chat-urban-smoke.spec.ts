import { test, expect } from "@playwright/test";
import { e2eLogin } from "./helpers";

/** CHB-011: smoke do fluxo urbano (início + tracker). */
test.describe("Chat urbano — smoke", () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test("inicia relato urbano e exibe tracker", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");

    const urbanChip = page.getByRole("button", { name: /relato urbano|problema na cidade|reportar/i }).first();
    if (await urbanChip.isVisible().catch(() => false)) {
      await urbanChip.click();
    } else {
      await page.fill("textarea", "Quero reportar um problema na cidade");
      await page.getByTestId("chat-send").click();
    }

    await expect(
      page.getByText(/passo\s+\d+\s+de\s+\d+/i).or(page.getByText(/tracker|coleta/i)),
    ).toBeVisible({ timeout: 25000 });
  });
});
