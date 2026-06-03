import { test, expect } from "@playwright/test";
import { e2eLogin } from "./helpers";
import type { Page } from "@playwright/test";
import { ensureChatReady, mockOrchestratorRoute, sendChatMessage } from "./_helpers/chatOrchestratorMock";

/** Expande listas longas (Ver mais) e aguarda o chat estabilizar para o print. */
async function settleForScreenshot(page: Page): Promise<void> {
  for (const btn of await page.getByRole("button", { name: /Ver mais/i }).all()) {
    await btn.click().catch(() => {});
  }
  await page
    .getByText(/Pensando/i)
    .first()
    .waitFor({ state: "hidden", timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(400);
}

/**
 * NREF006 — Diagramação. Evidência visual de que respostas com listas/tópicos
 * (paradas de ônibus, audiências) renderizam UM ITEM POR LINHA (mobile-first),
 * em vez de bloco corrido. Mocka o orquestrador para conteúdo determinístico.
 */

const PARADAS =
  "**Paradas encontradas:**\n" +
  "• **Afonso Braz C/B 1** (cód. 340015333) – R DOUTORA MARIA AUGUSTA SARAIVA\n" +
  "• **Afonso Braz C/B 2** (cód. 3407215) – Rua Santa Justina / Rua Afonso Braz\n" +
  "• **Agarum C/B** (cód. 640000361) – AV DR. FELIPE PINEL / TERMINAL PIRITUBA\n" +
  "• **Alfredo Reimberg B/C** (cód. 560009166) – R PAIOL VELHO / R NIELS CHRISTIAN SOERENSEN\n" +
  "• **Amaro Alves do Rosário B/C** (cód. 560009201) – R AMERICO COXA / R AMARO ALVES DO ROSARIO\n\n" +
  "_Use o código (cód.) para consultar previsão de chegada._";

const AUDIENCIAS =
  "Próximas audiências públicas agendadas:\n" +
  "📅 **Audiência:** Mobilidade urbana — 2026-02-19 às 12:48\n" +
  "📍 **Local:** Sala de reuniões 1\n" +
  "📋 Inscrições abertas\n" +
  "📅 **Audiência:** Saúde pública — 2026-02-20 às 13:10\n" +
  "📍 **Local:** Plenário\n" +
  "📋 Inscrições abertas\n\n" +
  "Quer saber mais sobre alguma ou inscrever-se?";

test.describe("NREF006 — Diagramação (listas legíveis)", () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
    await page.goto("/");
    await ensureChatReady(page);
  });

  test("paradas de ônibus — um item por linha", async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await mockOrchestratorRoute(page, () => PARADAS);
    await sendChatMessage(page, "Qual a linha de ônibus que passa na avenida Lineu de Paula Machado, 1477?");

    // Cada parada visível como item próprio
    await expect(page.getByText(/Afonso Braz C\/B 1/i).first()).toBeVisible();
    await expect(page.getByText(/Amaro Alves do Rosário/i).first()).toBeVisible();

    await settleForScreenshot(page);
    await page.screenshot({
      path: `test-results/nref006/${testInfo.project.name}-paradas.png`,
      fullPage: true,
    });
  });

  test("audiências — campos em linhas separadas", async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await mockOrchestratorRoute(page, () => AUDIENCIAS);
    await sendChatMessage(page, "Quais audiências públicas estão marcadas?");

    await expect(page.getByText(/Mobilidade urbana/i).first()).toBeVisible();
    await expect(page.getByText(/Saúde pública/i).first()).toBeVisible();

    await settleForScreenshot(page);
    await page.screenshot({
      path: `test-results/nref006/${testInfo.project.name}-audiencias.png`,
      fullPage: true,
    });
  });
});
