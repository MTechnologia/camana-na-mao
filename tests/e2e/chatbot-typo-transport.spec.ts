import { test, expect, type Page } from '@playwright/test';
import { dismissOnboardingIfVisible, e2eLogin } from './helpers';
import { TRANSPORT_LINE_FIXTURES } from './fixtures/transport-lines';
import { TRANSPORT_TYPO_SCENARIOS } from './fixtures/chatbot-typo-scenarios';
import {
  ensureChatReady,
  mockOrchestratorRoute,
  sendChatMessage,
  waitForAssistantReplyFinished,
} from './_helpers/chatOrchestratorMock';

async function mockTransportLineSearch(page: Page): Promise<void> {
  await page.route('**/rest/v1/transport_lines*', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(TRANSPORT_LINE_FIXTURES),
    });
  });
}

function createTransportTypoHandler() {
  const state = { step: 0 };
  return (body: { messages?: Array<{ role: string; content: string }> }) => {
    const latestUser = [...(body.messages ?? [])].reverse().find((m) => m.role === 'user')?.content ?? '';
    state.step += 1;
    if (state.step === 1) {
      return 'Vou registrar seu relato de transporte. Descreva o problema, por favor.';
    }
    if (state.step === 2) {
      return 'Qual linha ou estação teve o problema?';
    }
    if (state.step === 3) {
      return 'Quando isso aconteceu? (hoje, ontem ou informe a data)';
    }
    if (state.step === 4) {
      return 'Qual era o horário da ocorrência?';
    }
    if (state.step === 5) {
      return 'Qual era o sentido da viagem?';
    }
    if (state.step === 6) {
      return 'Com qual frequência isso acontece?';
    }
    if (state.step === 7) {
      return 'Como isso afetou sua rotina?';
    }
    const summary = [
      'Relato de transporte registrado com sucesso.',
      `Linha: ${latestUser.replace(/^Linha selecionada:\s*/i, '').trim() || '875A-10'}`,
      `Horário: ${latestUser.includes('7h') ? '07:05' : '08:00'}`,
      '[TRANSPORT_CREATED:22222222-2222-4222-8222-222222222222]',
    ].join('\n');
    return summary;
  };
}

async function selectLine(page: Page, searchTerm: string, lineCodeToPick: string): Promise<void> {
  const searchInput = page.getByPlaceholder(/Digite número ou nome/i).first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill(searchTerm);
    const lineOption = page.locator('button').filter({ hasText: new RegExp(lineCodeToPick, 'i') }).first();
    if (await lineOption.isVisible().catch(() => false)) {
      await lineOption.click();
      await waitForAssistantReplyFinished(page);
      return;
    }
  }
  await sendChatMessage(page, lineCodeToPick);
}

test.describe('Chatbot — transporte com typos (mock)', () => {
  test.beforeEach(async ({ page }) => {
    await mockTransportLineSearch(page);
    const transportHandler = createTransportTypoHandler();
    await mockOrchestratorRoute(page, transportHandler);
    await e2eLogin(page);
    await dismissOnboardingIfVisible(page);
  });

  for (const scenario of TRANSPORT_TYPO_SCENARIOS) {
    test(`fluxo com digitação informal (${scenario.id})`, async ({ page }) => {
      test.setTimeout(180000);
      await page.goto('/');
      await ensureChatReady(page);

      const chat = page.getByTestId('chat-messages');
      await sendChatMessage(page, 'quero relatar problema no transporte');
      await expect(chat.getByText(/descreva o problema|registrar seu relato de transporte/i).last()).toBeVisible({
        timeout: 15000,
      });

      await sendChatMessage(page, scenario.openingMessage);
      await expect(chat.getByText(/qual linha ou estação|qual linha ou estacao/i).last()).toBeVisible({
        timeout: 15000,
      });
      await selectLine(page, scenario.lineSearchTerm, scenario.lineCodeToPick);

      await sendChatMessage(page, 'hj');
      await expect(chat.getByText(/quando isso aconteceu|hoje|ontem|data/i).last()).toBeVisible({
        timeout: 15000,
      });

      await sendChatMessage(page, scenario.timeReply);
      await expect(chat.getByText(/horário|horario|que horas/i).last()).toBeVisible({ timeout: 15000 });

      await sendChatMessage(page, scenario.directionReply);
      await expect(chat.getByText(/sentido/i).last()).toBeVisible({ timeout: 15000 });

      await sendChatMessage(page, scenario.recurrenceReply);
      await expect(chat.getByText(/frequência|frequencia|recorrência|recorrencia/i).last()).toBeVisible({
        timeout: 15000,
      });

      await sendChatMessage(page, scenario.impactMessage);

      await expect(chat.getByText(/registrado|sucesso|TRANSPORT/i).last()).toBeVisible({
        timeout: 20000,
      });
    });
  }
});
