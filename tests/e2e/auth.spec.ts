import { test, expect } from '@playwright/test';
import { E2E_TEST_EMAIL, E2E_TEST_PASSWORD } from './test-user';
import { e2eLogin } from './helpers';

test.describe('Autenticação', () => {
  test('deve permitir registro de novo usuário', async ({ page }) => {
    await page.goto('/register');

    // Step 1: nome, email, celular
    await page.getByPlaceholder('Digite seu nome completo').fill('Usuário Teste');
    await page.getByPlaceholder('seuemail@exemplo.com').fill(`test-${Date.now()}@example.com`);
    await page.getByPlaceholder('(11) 99999-9999').fill('11999999999');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Step 2: senha
    await page.getByPlaceholder('Digite sua senha', { exact: true }).fill(E2E_TEST_PASSWORD);
    await page.getByPlaceholder('Digite sua senha novamente').fill(E2E_TEST_PASSWORD);
    await page.getByRole('checkbox', { name: /aceito os termos/i }).check();
    await page.getByRole('checkbox', { name: /aceito a política de privacidade/i }).check();
    await page.getByRole('button', { name: /Continuar|Criando conta/ }).click();

    // Step 2 -> Step 3 (Sobre você) - aguardar conta ser criada
    await expect(page.getByText(/conte mais sobre você|Sobre você/i).first()).toBeVisible({ timeout: 15000 });
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
    
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
});
