import { test, expect } from '@playwright/test';
import { dismissOnboardingIfVisible, e2eLogin } from './helpers';
import { URBAN_TYPO_SCENARIOS } from './fixtures/chatbot-typo-scenarios';
import { ensureChatReady, mockOrchestratorRoute, sendChatMessage } from './_helpers/chatOrchestratorMock';

function createUrbanTypoHandler() {
  const state = { step: 0 };
  return (_body: { messages?: Array<{ role: string; content: string }> }) => {
    state.step += 1;
    if (state.step === 1) {
      return 'Entendi. Vou registrar seu relato urbano. Pode descrever com mais detalhes o que está acontecendo?';
    }
    if (state.step === 2) {
      return '[COLLECTION_PROGRESS:urban_report:{"description":"problema informado","report_nature":"reclamacao"}][FIELD_REQUEST:location_method]Onde aconteceu? Informe o endereço ou use o mapa.\n\n[LOCATION_METHOD_PICKER]';
    }
    return 'Obrigado. Continue informando o endereço para concluir o relato.';
  };
}

test.describe('Chatbot — relato urbano com typos (mock)', () => {
  test.beforeEach(async ({ page }) => {
    const urbanHandler = createUrbanTypoHandler();
    await mockOrchestratorRoute(page, urbanHandler);
    await e2eLogin(page);
    await dismissOnboardingIfVisible(page);
  });

  for (const scenario of URBAN_TYPO_SCENARIOS) {
    test(`compreende abertura informal (${scenario.id})`, async ({ page }) => {
      test.setTimeout(90000);
      await page.goto('/');
      await ensureChatReady(page);

      const chat = page.getByTestId('chat-messages');
      await sendChatMessage(page, scenario.openingMessage);

      await expect(chat.getByText(scenario.assistantAck).last()).toBeVisible({ timeout: 20000 });

      await sendChatMessage(page, 'na rua das flores perto da escola');
      await expect(chat.getByText(/endereço|localização|mapa|onde/i).last()).toBeVisible({
        timeout: 15000,
      });
    });
  }
});
