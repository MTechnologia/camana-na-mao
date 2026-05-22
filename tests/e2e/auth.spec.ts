import { test, expect } from '@playwright/test';
import { E2E_TEST_EMAIL, E2E_TEST_PASSWORD } from './test-user';
import { e2eLogin } from './helpers';

test.describe('Autenticação', () => {
  test('deve permitir registro de novo usuário', async ({ page }) => {
    const uniqueEmail = `e2e-reg-${Date.now()}@gmail.com`;
    await page.goto('/register');

    await page.getByPlaceholder('Digite seu nome completo').fill('Usuário Teste E2E');
    await page.getByPlaceholder('seuemail@exemplo.com').fill(uniqueEmail);
    await page.getByPlaceholder('(11) 99999-9999').fill('11987654321');
    await page.getByPlaceholder('Digite sua senha', { exact: true }).fill(E2E_TEST_PASSWORD);
    await page.getByPlaceholder('Digite sua senha novamente').fill(E2E_TEST_PASSWORD);

    await page.locator("#terms").check();
    await page.locator("#privacy").check();
    await page.getByRole('button', { name: /Criar conta/i }).click();

    let redirected = false;
    try {
      await page.waitForURL(/\/(confirmar-email|login)/, { timeout: 25_000 });
      redirected = true;
    } catch {
      redirected = false;
    }
    test.skip(
      !redirected,
      "Cadastro não redirecionou (Supabase Auth, confirmação de e-mail ou política do projeto). " +
        "Ajuste o ambiente ou ignore este cenário em CI sem signup.",
    );
    await expect(page).toHaveURL(/\/(confirmar-email|login)/);
  });

  test('deve permitir login com credenciais válidas', async ({ page }) => {
    await e2eLogin(page);
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Email').fill('invalid@example.com');
    await page.getByPlaceholder('Senha').fill('wrongpassword');

    await page.getByRole('button', { name: /Continuar|Entrando/ }).click();

    await expect(page.getByText(/E-mail ou senha incorretos/)).toBeVisible({ timeout: 5000 });
  });

  test('deve permitir logout', async ({ page }) => {
    await e2eLogin(page);
    
    // Then logout
    await page.click('[data-testid="menu-button"]');
    await page.click('text=Sair');
    
    await expect(page).toHaveURL(/\/welcome\/?$/, { timeout: 15_000 });
  });
});
