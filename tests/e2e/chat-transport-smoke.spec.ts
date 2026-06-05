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

    // "Transporte Público" é um chip primário da Home (NREF008), não fica mais no
    // dropdown "Ver todos". Nome exato evita casar com itens do histórico de conversas
    // na barra lateral (ex.: "Quero relatar um problema no transporte público").
    const transportBtn = page
      .getByRole("button", { name: "Transporte Público", exact: true })
      .first();
    if (await transportBtn.isVisible().catch(() => false)) {
      await transportBtn.click();
    } else {
      await page.fill("textarea", "Quero relatar um problema no transporte público");
      await page.getByTestId("chat-send").click();
    }

    await expect(
      page
        .getByText(/linha|ônibus|transporte|horário/i)
        .first()
        .or(page.getByText(/passo\s+\d+\s+de\s+\d+/i)),
    ).toBeVisible({ timeout: 25000 });
  });
});
