import { test, expect } from '@playwright/test';
import { dismissOnboardingIfVisible, e2eLogin } from './helpers';
import {
  ensureChatReady,
  mockOrchestratorRoute,
  sendChatMessage,
} from './_helpers/chatOrchestratorMock';

test.describe('Chatbot — troca de jornada (mock)', () => {
  test.beforeEach(async ({ page }) => {
    await mockOrchestratorRoute(page, (body) => {
      const latestUser = [...(body.messages ?? [])].reverse().find((m) => m.role === 'user')?.content ?? '';
      if (latestUser.includes('[JOURNEY_SWITCHED:transport_report]')) {
        return '[COLLECTION_PROGRESS:transport_report:{"description":"","report_type":""}][FIELD_REQUEST:description]**O que aconteceu?** Me conta o problema.';
      }
      return '[COLLECTION_PROGRESS:urban_report:{"description":"buraco","category":"pavimentacao"}][FIELD_REQUEST:category]Qual o tema do problema?[JOURNEY_SWITCH_PROMPT:transport_report:urban_report]';
    });
    await e2eLogin(page);
    await dismissOnboardingIfVisible(page);
  });

  test('exibe aviso e confirma troca para transporte', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile-chrome',
      'Prompt de troca de jornada validado em desktop (mock); mobile em backlog CHB-E2E',
    );
    await page.goto('/');
    await ensureChatReady(page);
    await sendChatMessage(page, 'Tem um buraco na rua');

    const switchPrompt = page.getByText(/trocar|transporte|progresso/i).first();
    await expect(switchPrompt).toBeVisible({ timeout: 15000 });

    const confirmBtn = page.getByRole('button', { name: /transporte|sim.*transporte|iniciar/i }).first();
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
      await ensureChatReady(page);
    }

    await expect(
      page.locator('[data-testid="chat-messages"]').getByText(/transporte|linha|ônibus/i).first(),
    ).toBeVisible({ timeout: 20000 });
  });
});
