import { Page, expect } from '@playwright/test';
import { E2E_TEST_EMAIL, E2E_TEST_PASSWORD } from './test-user';

/**
 * Realiza login E2E com credenciais de .env.e2e.local.
 * Aguarda navegação para / antes de retornar.
 */
export async function e2eLogin(page: Page): Promise<void> {
  await page.goto('/login');

  // Usar placeholders (mais resiliente que input[type])
  await page.getByPlaceholder('Email').fill(E2E_TEST_EMAIL);
  await page.getByPlaceholder('Senha').fill(E2E_TEST_PASSWORD);

  await page.getByRole('button', { name: /Continuar|Entrando/ }).click();

  await expect(page).toHaveURL('/', { timeout: 15000 });
}
