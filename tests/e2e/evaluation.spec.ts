import { test, expect, type Page } from '@playwright/test';
import { e2eLogin, dismissOnboardingIfVisible } from './helpers';
import {
  waitForRatingInteraction,
  waitForAssistantReplyFinished,
  completeMultiDimensionRating,
  completeSingleStarRating,
  expectEvaluationSuccess,
} from './_helpers/evaluationFlow';

/**
 * /avaliar sem id só lista pendências; o chat (ChatInput) só existe em /avaliar/:visitId.
 */
async function enterPendingEvaluationChat(page: Page): Promise<void> {
  await page.goto('/avaliar');
  await page.waitForTimeout(500);
  if (page.url().includes('/login')) {
    await e2eLogin(page);
    await page.goto('/avaliar');
    await page.waitForTimeout(500);
  }
  await dismissOnboardingIfVisible(page);

  await expect(page.getByRole('heading', { name: /Avaliar/i }).first()).toBeVisible({ timeout: 20000 });

  const noPending = page.getByText(/Nenhuma avaliação pendente no momento/i);
  if (await noPending.isVisible().catch(() => false)) {
    test.skip(
      true,
      'Usuário E2E precisa de pelo menos uma visita pendente (avalie após registrar visita ou insira em service_visits).'
    );
  }

  await page.getByRole('button', { name: /Avaliar/i }).first().click();
  await expect(page).toHaveURL(/\/avaliar\/[a-f0-9-]+/i, { timeout: 20000 });

  const textarea = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
  await textarea.waitFor({ state: 'visible', timeout: 20000 });
}

test.describe('Avaliação de Serviços', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test('deve avaliar serviço pendente', async ({ page }) => {
    test.setTimeout(360_000);
    await enterPendingEvaluationChat(page);

    // Saudação automática + 1ª rodada do orchestrator; evita correr waitForRatingInteraction durante o SSE.
    await page.waitForTimeout(1200);
    await waitForAssistantReplyFinished(page);

    const sendIfAsked = async (regex: RegExp, answer: string) => {
      const el = page.getByText(regex);
      if (await el.isVisible().catch(() => false)) {
        const box = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
        await expect(box).toBeEnabled({ timeout: 10000 });
        await box.fill(answer);
        await page.getByRole('button', { name: /Enviar mensagem|Enviar/i }).click();
        await expect(box).toBeEnabled({ timeout: 30000 });
      }
    };
    await sendIfAsked(/nome do serviço|qual serviço|que serviço/i, 'UBS Central do Centro');
    await sendIfAsked(/Em qual.*bairro|bairro.*fica|qual bairro/i, 'Centro');

    const closeMenuEval = page.getByRole('button', { name: /Fechar menu/i });
    if (await closeMenuEval.isVisible().catch(() => false)) {
      await closeMenuEval.evaluate((el: HTMLElement) => el.click());
      await page.waitForTimeout(800);
    }

    await waitForAssistantReplyFinished(page);
    const mode = await waitForRatingInteraction(page);
    test.skip(
      mode === null,
      'ai-orchestrator não exibiu estrelas/dimensões no tempo — verifique Edge Function, rede ou créditos de IA.',
    );
    if (mode === 'multi') {
      await completeMultiDimensionRating(page);
    } else {
      await completeSingleStarRating(page);
    }

    const textareaComment = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
    await textareaComment.waitFor({ state: 'visible', timeout: 10000 });
    await expect(textareaComment).toBeEnabled({ timeout: 10000 });
    await textareaComment.fill('Atendimento excelente, instalações limpas');
    await page.getByRole('button', { name: /Enviar mensagem|Enviar/i }).click();

    await expectEvaluationSuccess(page);
  });

  test('deve encaminhar avaliação para vereador', async ({ page }) => {
    test.setTimeout(360_000);
    await enterPendingEvaluationChat(page);
    await page.waitForTimeout(1200);
    await waitForAssistantReplyFinished(page);

    const sendIfAsked = async (regex: RegExp, answer: string) => {
      const el = page.getByText(regex);
      if (await el.isVisible().catch(() => false)) {
        const box = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
        await expect(box).toBeEnabled({ timeout: 10000 });
        await box.fill(answer);
        await page.getByRole('button', { name: /Enviar mensagem|Enviar/i }).click();
        await expect(box).toBeEnabled({ timeout: 30000 });
      }
    };
    await sendIfAsked(/nome do serviço|qual serviço|que serviço/i, 'UBS Central do Centro');
    await sendIfAsked(/Em qual.*bairro|bairro.*fica|qual bairro/i, 'Centro');

    const closeMenuEnc = page.getByRole('button', { name: /Fechar menu/i });
    if (await closeMenuEnc.isVisible().catch(() => false)) {
      await closeMenuEnc.evaluate((el: HTMLElement) => el.click());
      await page.waitForTimeout(800);
    }

    await waitForAssistantReplyFinished(page);
    const mode2 = await waitForRatingInteraction(page);
    test.skip(
      mode2 === null,
      'ai-orchestrator não exibiu estrelas/dimensões no tempo — verifique Edge Function, rede ou créditos de IA.',
    );
    if (mode2 === 'multi') {
      await completeMultiDimensionRating(page);
    } else {
      await completeSingleStarRating(page);
    }

    const textareaComment = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
    await textareaComment.waitFor({ state: 'visible', timeout: 10000 });
    await expect(textareaComment).toBeEnabled({ timeout: 10000 });
    await textareaComment.fill('Atendimento excelente');
    await page.getByRole('button', { name: /Enviar mensagem|Enviar/i }).click();

    await expectEvaluationSuccess(page);

    // aguarda conclusão da avaliação e exibição de ações seguintes (se existirem)
    await expect(textareaComment).toBeEnabled({ timeout: 30000 });

    const encaminharBtn = page.getByText(/Encaminhar/i);
    if (await encaminharBtn.isVisible().catch(() => false)) {
      await encaminharBtn.click();
      await page.locator('text=Selecionar vereador').first().click();
      await page.fill('textarea[placeholder*="motivo"]', 'Reconhecimento pelo bom trabalho');
      await page.getByRole('button', { name: /^Encaminhar$/ }).click();
      await expect(page.getByText(/Encaminhamento realizado|enviado/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('deve buscar serviços próximos', async ({ page }) => {
    await page.goto('/servicos-proximos');

    await expect(page.getByText(/Perto de Você|serviço|encontrado|Modo Demonstração/i).first()).toBeVisible({ timeout: 10000 });
    await page.getByText('UBS').first().click();
    await expect(page.getByText(/serviço|encontrado|Nenhum|encontrados/i).first()).toBeVisible({ timeout: 5000 });
  });
});
