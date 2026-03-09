import { Page, expect } from '@playwright/test';
import { E2E_TEST_EMAIL, E2E_TEST_PASSWORD } from './test-user';

/**
 * Fecha o tutorial de onboarding se estiver visível.
 */
export async function dismissOnboardingIfVisible(page: Page): Promise<void> {
  const skipBtn = page.getByRole('button', { name: /Pular tutorial/i });
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Realiza login E2E com credenciais de .env.e2e.local.
 * Aguarda navegação para / ou /welcome e garante sessão estável.
 */
export async function e2eLogin(page: Page): Promise<void> {
  await page.goto('/login');

  await page.getByPlaceholder('Email').fill(E2E_TEST_EMAIL);
  await page.getByPlaceholder('Senha').fill(E2E_TEST_PASSWORD);

  await page.getByRole('button', { name: /Continuar|Entrando/ }).click();

  await expect(page).toHaveURL(/\/(|welcome)$/, { timeout: 15000 });
  await page.waitForLoadState('domcontentloaded');

  // Fecha onboarding se aparecer (overlay no Home)
  await dismissOnboardingIfVisible(page);

  // Se estamos em /, aguarda breve estabilização do chat (timeout curto)
  if (page.url().endsWith('/') || page.url().match(/\/\?/)) {
    const chatReady = page.getByTestId('chat-send').or(page.locator('textarea')).or(page.getByText(/Sobre o que deseja falar|O que deseja falar|Transporte/i));
    await chatReady.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }
}
