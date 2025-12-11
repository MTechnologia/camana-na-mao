import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {
  test('deve permitir registro de novo usuário', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test@123456');
    await page.fill('input[name="fullName"]', 'Usuário Teste');
    await page.fill('input[name="phone"]', '11999999999');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/ia', { timeout: 10000 });
  });

  test('deve permitir login com credenciais válidas', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test@123456');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/ia', { timeout: 10000 });
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Credenciais inválidas')).toBeVisible();
  });

  test('deve permitir logout', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/ia', { timeout: 10000 });
    
    // Then logout
    await page.click('[data-testid="menu-button"]');
    await page.click('text=Sair');
    
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
});