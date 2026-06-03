import { expect, type Page } from "@playwright/test";

/** Textos de conclusão no chat, toast ou card da página de avaliação */
export const EVALUATION_SUCCESS_RE =
  /obrigado|Avaliação enviada|avaliação enviada|avaliada|registrada|Sua avaliação foi|Avaliação enviada com sucesso|sucesso/i;

/** Aguarda o SSE do assistente terminar (`ConversationalEvaluation` desabilita o input enquanto `isLoading`). */
export async function waitForAssistantReplyFinished(page: Page, timeout = 220_000): Promise<void> {
  const input = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
  await expect(input).toBeEnabled({ timeout });
}

/** Depois do assistente terminar: tempo para o React pintar pickers (multi / estrelas). */
export const RATING_UI_AFTER_REPLY_MS = 120_000;

/** @deprecated use RATING_UI_AFTER_REPLY_MS após waitForAssistantReplyFinished */
export const RATING_UI_WAIT_MS = RATING_UI_AFTER_REPLY_MS;

/**
 * Aguarda a UI de avaliação (nota única com data-star OU fluxo multi-dimensional).
 * Depende da Edge Function `ai-orchestrator` responder no ambiente E2E.
 */
export async function waitForRatingInteraction(
  page: Page,
  timeout = RATING_UI_AFTER_REPLY_MS,
): Promise<"multi" | "single" | null> {
  const multiHint = page.getByText(/Avalie cada aspecto|em cada aspecto/i).first();
  const multiHintBody = page.getByText(/demais dimensões de 1 a 5 estrelas/i).first();
  /** `MultiDimensionRatingPicker`: grupo de estrelas da dimensão Atendimento */
  const multiAtendimentoGroup = page.getByRole("group", { name: /Avaliação:\s*Atendimento/i }).first();
  /** `InlineRatingPicker` nota geral */
  const inlineSingleGroup = page.getByRole("group", { name: /Avaliação por estrelas/i }).first();
  /** Fluxo atómico por dimensão (ainda com [data-star]) */
  const inlineDimGroup = page
    .getByRole("group", { name: /Avaliação de (atendimento|limpeza|infraestrutura)/i })
    .first();
  const anySingleStar = page.locator("[data-star]").first();

  await Promise.race([
    multiHint.waitFor({ state: "visible", timeout }),
    multiHintBody.waitFor({ state: "visible", timeout }),
    multiAtendimentoGroup.waitFor({ state: "visible", timeout }),
    inlineSingleGroup.waitFor({ state: "visible", timeout }),
    inlineDimGroup.waitFor({ state: "visible", timeout }),
    anySingleStar.waitFor({ state: "visible", timeout }),
  ]).catch(() => undefined);

  const multi =
    (await multiHint.isVisible().catch(() => false)) ||
    (await multiHintBody.isVisible().catch(() => false)) ||
    (await multiAtendimentoGroup.isVisible().catch(() => false));
  if (multi) return "multi";

  const single =
    (await inlineSingleGroup.isVisible().catch(() => false)) ||
    (await inlineDimGroup.isVisible().catch(() => false)) ||
    (await anySingleStar.isVisible().catch(() => false));
  if (single) return "single";

  return null;
}

/** Fluxo atual: 3 dimensões com estrelas (aria-label) + tempo de espera em faixas */
export async function completeMultiDimensionRating(
  page: Page,
  stars: 1 | 2 | 3 | 4 | 5 = 5,
): Promise<void> {
  for (const label of ["Atendimento", "Limpeza", "Infraestrutura"] as const) {
    const btn = page.getByRole("button", {
      name: new RegExp(`${label}:\\s*${stars} estrela`, "i"),
    });
    await btn.waitFor({ state: "visible", timeout: 60_000 });
    await btn.click();
    await page.waitForTimeout(400);
  }
  await page.getByRole("button", { name: /Menos de 15 minutos/i }).first().click();
  await page.waitForTimeout(2000);
}

/** Fluxo legado: uma nota geral + picker de tempo de espera (ou dimensão atómica com data-star) */
export async function completeSingleStarRating(page: Page, stars: 1 | 2 | 3 | 4 | 5 = 5): Promise<void> {
  const inInlineGroup = page
    .getByRole("group", {
      name: /Avaliação por estrelas|Avaliação de (atendimento|limpeza|infraestrutura)/i,
    })
    .locator(`[data-star="${stars}"]`)
    .first();
  if (await inInlineGroup.isVisible().catch(() => false)) {
    await inInlineGroup.click();
  } else {
    await page.locator(`[data-star="${stars}"]`).first().click();
  }
  await page.waitForTimeout(1500);
  const wt = page.getByRole("group", { name: /tempo de espera/i });
  if (await wt.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /Menos de 15 minutos/i }).first().click();
    await page.waitForTimeout(2000);
  }
}

export async function expectEvaluationSuccess(page: Page): Promise<void> {
  await expect(page.getByText(EVALUATION_SUCCESS_RE).first()).toBeVisible({
    timeout: 45_000,
  });
}
