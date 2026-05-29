import { test, expect } from "@playwright/test";
import { e2eLogin } from "./helpers";

/** CHB-011 / CHB-024: smoke hub de avaliação. */
test.describe("Avaliação — smoke", () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test("página /avaliar carrega lista ou modo livre", async ({ page }) => {
    await page.goto("/avaliar");
    await expect(
      page.getByText(/avaliar|visita|serviço|pendente/i).first(),
    ).toBeVisible({ timeout: 20000 });
  });
});
