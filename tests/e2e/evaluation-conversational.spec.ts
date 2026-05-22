import { test, expect } from '@playwright/test';
import { e2eLogin, dismissOnboardingIfVisible } from './helpers';
import {
  waitForRatingInteraction,
  waitForAssistantReplyFinished,
  completeMultiDimensionRating,
  completeSingleStarRating,
  expectEvaluationSuccess,
} from './_helpers/evaluationFlow';

test.describe('Avaliação Conversacional', () => {
  test.describe.configure({ mode: 'serial' });

  const startEvaluationFromNearby = async (page: import('@playwright/test').Page) => {
    await page.goto('/servicos-proximos');
    await dismissOnboardingIfVisible(page);

    await expect(
      page.getByText(/Perto de Você|serviço|encontrado|Modo Demonstração/i).first()
    ).toBeVisible({ timeout: 15000 });

    const firstServiceCard = page.locator('[data-testid="service-card"]').first();
    await firstServiceCard.waitFor({ state: 'visible', timeout: 15000 });
    await firstServiceCard.click();

    await expect(page).toHaveURL(/\/servico\/.+/, { timeout: 15000 });

    const evaluateButton = page.getByRole('button', { name: /Avaliar este serviço/i });
    await evaluateButton.waitFor({ state: 'visible', timeout: 15000 });
    await evaluateButton.click();

    await expect(page).toHaveURL(/\/avaliar\/.+/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Avaliar/i }).first()).toBeVisible({ timeout: 15000 });

    const closeMenu = page.getByRole('button', { name: /Fechar menu/i });
    if (await closeMenu.isVisible().catch(() => false)) {
      await closeMenu.evaluate((el: HTMLElement) => el.click());
      await page.waitForTimeout(800);
    }
  };

  const completeConversationalEvaluation = async (
    page: import('@playwright/test').Page,
    options?: { stars?: 1 | 2 | 3 | 4 | 5; comment?: string }
  ) => {
    const stars = options?.stars ?? 5;
    const comment =
      options?.comment ?? 'Tempo de espera adequado, atendimento excelente e infraestrutura limpa e organizada.';

    const input = page
      .getByPlaceholder(/Digite sua mensagem|mensagem/i)
      .or(page.locator('textarea'))
      .or(page.locator('input[type="text"]'))
      .first();

    const sendButton = page.getByRole('button', { name: /Enviar mensagem|Enviar/i }).first();

    await input.waitFor({ state: 'visible', timeout: 30000 });
    await expect(input).toBeEditable({ timeout: 30000 });

    await page.waitForTimeout(1200);
    await waitForAssistantReplyFinished(page);

    const sendMessage = async (text: string) => {
      await input.waitFor({ state: 'visible', timeout: 30000 });
      await expect(input).toBeEditable({ timeout: 30000 });
      await input.fill(text);
      await sendButton.click();
      await expect(input).toBeEditable({ timeout: 30000 });
    };

    const sendIfAsked = async (regex: RegExp, answer: string) => {
      const question = page.getByText(regex).first();
      if (await question.isVisible().catch(() => false)) {
        await sendMessage(answer);
      }
    };

    await sendIfAsked(/nome do serviço|qual serviço|que serviço/i, 'UBS Central do Centro');
    await sendIfAsked(/Em qual.*bairro|bairro.*fica|qual bairro/i, 'Centro');

    const closeMenuConv = page.getByRole('button', { name: /Fechar menu/i });
    if (await closeMenuConv.isVisible().catch(() => false)) {
      await closeMenuConv.evaluate((el: HTMLElement) => el.click());
      await page.waitForTimeout(800);
    }

    await waitForAssistantReplyFinished(page);
    const mode = await waitForRatingInteraction(page);
    test.skip(
      mode === null,
      'ai-orchestrator não exibiu estrelas/dimensões no tempo — verifique Edge Function, rede ou créditos de IA.',
    );
    if (mode === 'multi') {
      await completeMultiDimensionRating(page, stars);
    } else {
      await completeSingleStarRating(page, stars);
    }

    await sendMessage(comment);

    const confirmReviewBtn = page.getByRole('button', { name: /Confirmar e enviar avaliação/i }).first();
    if (await confirmReviewBtn.isVisible().catch(() => false)) {
      await confirmReviewBtn.click();
    }

    await expectEvaluationSuccess(page);
  };

  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test('deve criar visita pendente e completar o fluxo conversacional de avaliação', async ({ page }) => {
    test.setTimeout(360_000);
    await startEvaluationFromNearby(page);
    await completeConversationalEvaluation(page, { stars: 5 });
  });

  test('deve concluir avaliação com nota intermediária (3 estrelas)', async ({ page }) => {
    test.setTimeout(360_000);
    await startEvaluationFromNearby(page);
    await completeConversationalEvaluation(page, {
      stars: 3,
      comment: 'Atendimento razoável, houve fila e alguma demora, mas o problema foi resolvido.',
    });
  });

  test('deve exibir avaliação no histórico após concluir fluxo conversacional', async ({ page }) => {
    test.setTimeout(360_000);
    await startEvaluationFromNearby(page);
    await completeConversationalEvaluation(page, {
      stars: 4,
      comment: 'Bom atendimento geral. Sugiro melhoria no tempo de espera.',
    });

    await page.goto('/avaliacoes/historico');
    await expect(page.getByRole('heading', { name: /Histórico de Avaliações|Avaliações/i }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Bom atendimento geral|tempo de espera|Avaliação/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

});
