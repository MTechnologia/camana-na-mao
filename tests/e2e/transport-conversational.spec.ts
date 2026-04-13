import { test, expect, type Page } from '@playwright/test';
import { dismissOnboardingIfVisible, e2eLogin } from './helpers';
import {
  TRANSPORT_CONVERSATIONAL_SCENARIOS,
  TRANSPORT_LINE_FIXTURES,
} from './fixtures/transport-lines';

function buildSseResponse(content: string): string {
  return [
    `data: ${JSON.stringify({ choices: [{ delta: { content } }], conversationId: 'mock-transport-conversation' })}`,
    '',
    'data: [DONE]',
    '',
  ].join('\n');
}

async function mockTransportAiOrchestrator(page: Page): Promise<void> {
  const state = {
    step: 0,
    reportType: 'Atraso',
    subcategory: 'Demora excessiva',
    severity: 'Média',
    line: '',
    date: '',
    time: '',
    direction: '',
    recurrence: '',
  };

  await page.route('**/functions/v1/ai-orchestrator', async (route) => {
    const body = route.request().postDataJSON() as
      | { messages?: Array<{ role: string; content: string }> }
      | undefined;
    const messages = body?.messages ?? [];
    const latestUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

    let assistantText = 'Descreva o problema, por favor.';
    if (state.step === 0) {
      assistantText = 'Olá! Vou registrar seu relato de transporte. Descreva o problema, por favor.';
      state.step = 1;
    } else if (state.step === 1) {
      const lower = latestUser.toLowerCase();
      if (/motorista|freando|perig|acidente/.test(lower)) {
        state.reportType = 'Condução';
        state.subcategory = 'Condução perigosa';
        state.severity = 'Alta';
      } else {
        state.reportType = 'Atraso';
        state.subcategory = 'Demora excessiva';
        state.severity = 'Média';
      }
      assistantText = 'Qual linha ou estação teve o problema?';
      state.step = 2;
    } else if (state.step === 2) {
      state.line = latestUser.replace(/^Linha selecionada:\s*/i, '').trim();
      assistantText = 'Quando isso aconteceu? (hoje, ontem, ou me diga a data)';
      state.step = 3;
    } else if (state.step === 3) {
      state.date = latestUser.trim();
      assistantText = 'Qual era o horário da ocorrência?';
      state.step = 4;
    } else if (state.step === 4) {
      state.time = latestUser.replace(/^Horário:\s*/i, '').trim();
      assistantText = 'Qual era o sentido da viagem?';
      state.step = 5;
    } else if (state.step === 5) {
      state.direction = latestUser.replace(/^Sentido:\s*/i, '').trim();
      assistantText = 'Com qual frequência isso acontece?';
      state.step = 6;
    } else if (state.step === 6) {
      state.recurrence = latestUser.replace(/^Frequência:\s*/i, '').trim();
      assistantText = 'Como isso afetou sua rotina?';
      state.step = 7;
    } else if (state.step === 7) {
      const summary = [
        'Relato de transporte registrado com sucesso.',
        `Tipo: ${state.reportType} - ${state.subcategory}`,
        `Linha: ${state.line || 'não informada'}`,
        `Data: ${state.date || 'hoje'}`,
        `Horário: ${state.time || '08:00'}`,
        `Sentido: ${state.direction || 'ida'}`,
        `Frequência: ${state.recurrence || 'toda semana'}`,
        `Gravidade: ${state.severity}`,
        '[TRANSPORT_CREATED:11111111-1111-4111-8111-111111111111]',
      ].join('\n');
      assistantText = summary;
      state.step = 8;
    } else {
      assistantText = 'Relato já registrado. Se quiser, posso iniciar um novo relato.';
    }

    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      },
      body: buildSseResponse(assistantText),
    });
  });
}

async function mockTransportLineSearch(page: Page): Promise<void> {
  await page.route('**/rest/v1/transport_lines*', async (route) => {
    const url = new URL(route.request().url());
    const orFilter = url.searchParams.get('or') || '';
    const normalized = decodeURIComponent(orFilter).toLowerCase();

    const filtered = TRANSPORT_LINE_FIXTURES.filter((line) => {
      if (!normalized) return true;
      const haystack = `${line.line_code} ${line.line_name}`.toLowerCase();
      const terms = normalized
        .split(',')
        .map((part) => part.replace(/.*ilike\.\%/i, '').replace(/\%.*/i, '').trim())
        .filter(Boolean);
      return terms.some((term) => haystack.includes(term));
    });

    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(filtered),
    });
  });
}

async function sendChatMessage(page: Page, text: string): Promise<void> {
  const input = page.locator('textarea').first();
  const sendBtn = page.getByTestId('chat-send').first();
  await input.waitFor({ state: 'visible', timeout: 20000 });
  await input.fill(text);
  await sendBtn.click();
}

async function ensureChatReady(page: Page): Promise<void> {
  // Em alguns cenários o drawer lateral fica aberto e cobre interações.
  const closeMenu = page.getByRole('button', { name: /Fechar menu/i }).first();
  if (await closeMenu.isVisible().catch(() => false)) {
    await closeMenu.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(800);
  }
  await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 20000 });
}

async function ensureTransportJourney(page: Page): Promise<void> {
  const chat = page.getByTestId('chat-messages');
  await sendChatMessage(page, 'Quero relatar um problema no transporte público');

  // Evita dependência do tracker visual; confirma pela resposta do assistente.
  await expect(
    chat
      .getByText(
        /transporte|qual linha|linha de ônibus|linha de onibus|o que aconteceu|me conta o problema/i
      )
      .first()
  ).toBeVisible({ timeout: 15000 });
}

async function selectLine(page: Page, searchTerm: string, lineCodeToPick: string): Promise<void> {
  const searchInput = page.getByPlaceholder(/Digite número ou nome/i).first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill(searchTerm);

    const lineOption = page.locator('button').filter({ hasText: new RegExp(lineCodeToPick, 'i') }).first();
    if (await lineOption.isVisible().catch(() => false)) {
      await lineOption.click();
      return;
    }

    const useCustom = page.getByRole('button', { name: new RegExp(`Usar\\s+"?${searchTerm}"?`, 'i') }).first();
    if (await useCustom.isVisible().catch(() => false)) {
      await useCustom.click();
      return;
    }
  }

  // Fallback textual caso o inline picker não esteja disponível/visível.
  await sendChatMessage(page, lineCodeToPick);
}

async function finishTransportConversation(
  page: Page,
  scenario: (typeof TRANSPORT_CONVERSATIONAL_SCENARIOS)[number]
): Promise<void> {
  await ensureTransportJourney(page);
  const chat = page.getByTestId('chat-messages');
  await expect(chat.getByText(/descreva o problema|o que aconteceu/i).last()).toBeVisible({ timeout: 15000 });
  await sendChatMessage(page, scenario.openingMessage);

  await expect(chat.getByText(/qual linha|linha ou estação/i).last()).toBeVisible({ timeout: 15000 });
  await selectLine(page, scenario.lineSearchTerm, scenario.lineCodeToPick);

  await expect(chat.getByText(/quando isso aconteceu|hoje|ontem|data/i).last()).toBeVisible({ timeout: 15000 });
  await sendChatMessage(page, 'hoje');

  await expect(chat.getByText(/horário|horario|que horas/i).last()).toBeVisible({ timeout: 15000 });
  await sendChatMessage(page, '08:00');

  await expect(chat.getByText(/sentido/i).last()).toBeVisible({ timeout: 15000 });
  await sendChatMessage(page, /volta/i.test(String(scenario.directionButtonLabel)) ? 'volta' : 'ida');

  await expect(chat.getByText(/frequência|frequencia|recorrência|recorrencia/i).last()).toBeVisible({
    timeout: 15000,
  });
  await sendChatMessage(
    page,
    /todos os dias/i.test(String(scenario.recurrenceButtonLabel)) ? 'todos os dias' : 'toda semana'
  );

  await expect(chat.getByText(/impacto|afetou|sua rotina/i).last()).toBeVisible({ timeout: 15000 });
  await sendChatMessage(page, scenario.impactMessage);

  // Evidências dos novos campos coletados no resumo final.
  await expect(chat.getByText(scenario.expectedTypeLabel).first()).toBeVisible({ timeout: 15000 });
  await expect(chat.getByText(/Horário:|Horario:/i).first()).toBeVisible({ timeout: 20000 });
  await expect(chat.getByText(/Sentido:/i).first()).toBeVisible({ timeout: 15000 });
  await expect(chat.getByText(/Frequência:|Frequencia:/i).first()).toBeVisible({ timeout: 15000 });
  await expect(chat.getByText(scenario.expectedSeverityLabel).first()).toBeVisible({ timeout: 15000 });

  // "Tipo: <categoria> - <subcategoria>" evidencia categoria + subcategoria.
  await expect(chat.getByText(/Tipo:\s*.+\s-\s.+/i).first()).toBeVisible({ timeout: 15000 });
}

test.describe('Diagnóstico Conversacional de Transporte', () => {
  test.beforeEach(async ({ page }) => {
    await mockTransportLineSearch(page);
    await mockTransportAiOrchestrator(page);
    await e2eLogin(page);
    await dismissOnboardingIfVisible(page);
  });

  for (const scenario of TRANSPORT_CONVERSATIONAL_SCENARIOS) {
    test(`deve completar fluxo com novos campos (${scenario.name})`, async ({ page }) => {
      test.setTimeout(180000);

      await page.goto('/?journey=transport_report');
      await ensureChatReady(page);

      await finishTransportConversation(page, scenario);
    });
  }
});
