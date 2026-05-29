import { test, expect } from "@playwright/test";
import { e2eLogin } from "./helpers";

/** CHB-011: smoke transporte — início de jornada. */
test.describe("Chat transporte — smoke", () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test("inicia jornada de transporte", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");

    const transportBtn = page.getByRole("button", { name: /Transporte/i }).first();
    if (await transportBtn.isVisible().catch(() => false)) {
      await transportBtn.click();
    } else {
      await page.getByRole("button", { name: /Ver todos/i }).click();
      await page.getByRole("menuitem", { name: /Transporte/i }).click();
    }

    await expect(
      page
        .getByText(/linha|ônibus|transporte|horário/i)
        .first()
        .or(page.getByText(/passo\s+\d+\s+de\s+\d+/i)),
    ).toBeVisible({ timeout: 25000 });
  });
});
