import { test, expect } from "@playwright/test";
import { e2eLogin } from "./helpers";
import { ensureChatReady, mockOrchestratorRoute, sendChatMessage } from "./_helpers/chatOrchestratorMock";

/**
 * NREF011 — Diagramação mobile-first. O seletor de localização (GPS / endereço /
 * CEP) tinha a descrição do GPS cortada na borda no mobile (Button com
 * whitespace-nowrap). Esta evidência mostra o texto quebrando corretamente
 * (sem corte), em mobile e desktop.
 */

const LOCATION_PROMPT =
  "Como você quer informar **onde fica** o problema? Toque em **Usar minha localização (GPS)** abaixo, " +
  "ou escolha **endereço cadastrado** / **digitar CEP ou endereço**.\n\n[LOCATION_METHOD_PICKER]";

test.describe("NREF011 — Seletor de localização (texto sem corte, mobile-first)", () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
    await page.goto("/");
    await ensureChatReady(page);
  });

  test("descrição do GPS quebra e fica visível (sem corte)", async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await mockOrchestratorRoute(page, () => LOCATION_PROMPT);
    await sendChatMessage(page, "Tem um buraco enorme na minha rua");

    // As 3 opções do seletor aparecem
    await expect(page.getByText("Usar minha localização (GPS)").first()).toBeVisible();
    await expect(page.getByText("Usar endereço cadastrado").first()).toBeVisible();
    await expect(page.getByText("Digitar CEP ou endereço").first()).toBeVisible();
    // A descrição completa do GPS (final do texto) deve estar visível, não cortada
    await expect(page.getByText(/endereço aproximado ao assistente/i).first()).toBeVisible();

    // Aguarda eventual indicador "Pensando..." sumir, para o print ficar limpo.
    await page
      .getByText(/Pensando/i)
      .first()
      .waitFor({ state: "hidden", timeout: 8000 })
      .catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `test-results/nref011/${testInfo.project.name}-location-picker.png`,
      fullPage: true,
    });
  });
});
