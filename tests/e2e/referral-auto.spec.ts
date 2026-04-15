import { test, expect, type Page } from '@playwright/test';
import { dismissOnboardingIfVisible, e2eLogin } from './helpers';

const LOW_RATING_ID = '22222222-2222-4222-8222-222222222222';
const SUGGESTED_COUNCIL_MEMBER_ID = '33333333-3333-4333-8333-333333333333';

test.use({ serviceWorkers: 'block' });

function buildSseResponse(content: string): string {
  return [
    `data: ${JSON.stringify({ choices: [{ delta: { content } }], conversationId: 'mock-referral-auto' })}`,
    '',
    'data: [DONE]',
    '',
  ].join('\n');
}

async function sendChatMessage(page: Page, text: string): Promise<void> {
  const input = page.locator('textarea').first();
  const sendBtn = page.getByTestId('chat-send').first();
  if (!(await input.isVisible().catch(() => false))) {
    const closeMenu = page.getByRole('button', { name: /Fechar menu/i }).first();
    if (await closeMenu.isVisible().catch(() => false)) {
      await closeMenu.click();
    }
    await page.waitForTimeout(500);
  }
  await input.waitFor({ state: 'visible', timeout: 20000 });
  await input.fill(text);
  await sendBtn.click();
}

async function ensureChatComposerReady(page: Page): Promise<void> {
  const input = page.locator('textarea').first();

  if (!(await input.isVisible().catch(() => false))) {
    await page.goto('/');
  }

  await input.waitFor({ state: 'visible', timeout: 25000 });
  await expect(page.getByTestId('chat-send').first()).toBeVisible({ timeout: 10000 });
}

async function mockLowRatingConversation(page: Page): Promise<void> {
  const state = { step: 0 };

  await page.context().route('**/functions/v1/ai-orchestrator', async (route) => {
    const body = route.request().postDataJSON() as
      | { messages?: Array<{ role: string; content: string }> }
      | undefined;
    const latestUser =
      [...(body?.messages ?? [])].reverse().find((m) => m.role === 'user')?.content?.toLowerCase() ?? '';

    let assistantText = 'Você pode me contar como foi o atendimento?';
    if (state.step === 0) {
      assistantText = 'Vamos registrar sua avaliação. Qual nota você dá de 1 a 5?';
      state.step = 1;
    } else if (state.step === 1) {
      if (latestUser.includes('2') || latestUser.includes('duas') || latestUser.includes('ruim')) {
        assistantText = [
          `[RATING_CREATED:${LOW_RATING_ID}]`,
          'Avaliação registrada com nota baixa (2/5).',
          'Posso oferecer encaminhamento automático para a comissão sugerida. Deseja encaminhar?',
        ].join('\n');
      } else {
        assistantText = 'Avaliação registrada. Obrigado pelo feedback!';
      }
      state.step = 2;
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

async function mockRatingsHistoryAndReferralApis(page: Page): Promise<{ getInsertedCouncilMemberId: () => string | null }> {
  let insertedCouncilMemberId: string | null = null;

  await page.context().route('**/functions/v1/fetch-vereadores', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        vereadores: [
          {
            id: SUGGESTED_COUNCIL_MEMBER_ID,
            name: 'Vereadora Ana Souza',
            party: 'ABC',
            region: 'Centro',
            initials: 'AS',
            photo: '',
          },
        ],
      }),
    });
  });

  await page.context().route('**/functions/v1/suggest-council-members', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suggestions: [
          {
            vereador: { id: SUGGESTED_COUNCIL_MEMBER_ID },
            matchScore: 95,
            matchReasons: ['Comissão de Saúde é responsável por UBS e atendimento básico.'],
          },
        ],
      }),
    });
  });

  await page.context().route('**/rest/v1/council_member_referrals**', async (route) => {
    const payload = route.request().postDataJSON() as { council_member_id?: string } | undefined;
    insertedCouncilMemberId = payload?.council_member_id ?? null;

    await route.fulfill({
      status: 201,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([]),
    });
  });

  return {
    getInsertedCouncilMemberId: () => insertedCouncilMemberId,
  };
}

function decodeJwtSub(token: string): string | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(normalized, 'base64').toString('utf-8')) as { sub?: string };
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

async function ensureReferralRoleViaServiceKey(page: Page): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return;

  const accessToken = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as { access_token?: string };
        if (parsed.access_token) return parsed.access_token;
      } catch {
        // ignore malformed entries
      }
    }
    return null;
  });

  const userId = accessToken ? decodeJwtSub(accessToken) : null;
  if (!userId) return;

  await page.request.post(`${supabaseUrl}/rest/v1/user_roles?on_conflict=user_id,role`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    data: [{ user_id: userId, role: 'cidadao_engajado' }],
  });
}

test.describe('Encaminhamento automático para avaliação negativa', () => {
  test.beforeEach(async ({ page }) => {
    await mockLowRatingConversation(page);
    await e2eLogin(page);
    await dismissOnboardingIfVisible(page);
    await ensureReferralRoleViaServiceKey(page);
  });

  test('deve ofertar encaminhamento no chat e encaminhar para a comissão sugerida', async ({ page }) => {
    test.setTimeout(180000);

    const referralApiState = await mockRatingsHistoryAndReferralApis(page);

    await page.goto('/?journey=service_rating');
    await ensureChatComposerReady(page);
    await sendChatMessage(page, 'Quero avaliar um serviço público');
    await expect(page.getByText(/qual nota você dá|nota de 1 a 5/i).first()).toBeVisible({ timeout: 15000 });

    await sendChatMessage(page, 'Dou nota 2, foi muito ruim');
    await expect(
      page
        .getByText(/encaminhamento automático|deseja encaminhar|comissão sugerida/i)
        .first()
    ).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'test-results/referral-auto-01-oferta-chat.png', fullPage: true });

    await page.goto('/avaliacoes/historico');
    await expect(page.getByRole('heading', { name: /Minhas Avaliações/i })).toBeVisible({ timeout: 15000 });

    const referralButton = page.getByRole('button', { name: /Encaminhar para vereador/i }).first();
    await expect(referralButton).toBeVisible({ timeout: 15000 });
    await referralButton.click();

    await expect(page.getByText(/Revisar Relato/i).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /^Continuar$/i }).first().click();

    await expect(page.getByText(/Escolher Vereador/i).first()).toBeVisible({ timeout: 15000 });
    await page.getByText(/Vereadora Ana Souza/i).first().click();
    await expect(page.getByText(/Comissão de Saúde/i).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /^Continuar$/i }).first().click();

    await expect(page.getByText(/Mensagem Pessoal/i).first()).toBeVisible({ timeout: 15000 });
    await page
      .getByPlaceholder(/Escreva aqui sua mensagem/i)
      .fill('Solicito encaminhamento para a comissão sugerida devido à gravidade do atendimento.');
    await page.getByRole('button', { name: /Encaminhar/i }).first().click();

    await expect(page.getByText(/Relato Encaminhado!/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Vereadora Ana Souza/i).first()).toBeVisible({ timeout: 15000 });
    await expect
      .poll(() => referralApiState.getInsertedCouncilMemberId(), { timeout: 10000 })
      .toBe(SUGGESTED_COUNCIL_MEMBER_ID);
    await page.screenshot({ path: 'test-results/referral-auto-02-sucesso-final.png', fullPage: true });
  });
});
