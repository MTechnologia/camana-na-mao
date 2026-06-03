import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export function buildSseResponse(content: string, conversationId = 'mock-chatbot-conversation'): string {
  return [
    `data: ${JSON.stringify({ choices: [{ delta: { content } }], conversationId })}`,
    '',
    'data: [DONE]',
    '',
  ].join('\n');
}

export async function mockOrchestratorRoute(
  page: Page,
  handler: (body: { messages?: Array<{ role: string; content: string }> }) => string,
): Promise<void> {
  await page.route('**/functions/v1/ai-orchestrator', async (route) => {
    const body = route.request().postDataJSON() as
      | { messages?: Array<{ role: string; content: string }> }
      | undefined;
    const assistantText = handler(body ?? {});
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

/** Aguarda o SSE do assistente terminar (textarea habilitada de novo). */
export async function waitForAssistantReplyFinished(page: Page, timeout = 30_000): Promise<void> {
  const input = page.locator('textarea').first();
  await expect(input).toBeEnabled({ timeout });
}

export async function sendChatMessage(page: Page, text: string): Promise<void> {
  const input = page.locator('textarea').first();
  const sendBtn = page.getByTestId('chat-send').first();
  await input.waitFor({ state: 'visible', timeout: 20000 });
  await expect(input).toBeEnabled({ timeout: 30000 });
  await input.fill(text);
  await sendBtn.click();
  await waitForAssistantReplyFinished(page);
}

export async function ensureChatReady(page: Page): Promise<void> {
  const closeMenu = page.getByRole('button', { name: /Fechar menu/i }).first();
  if (await closeMenu.isVisible().catch(() => false)) {
    await closeMenu.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(800);
  }
  await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 20000 });
}
