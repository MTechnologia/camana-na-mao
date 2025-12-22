import { test, expect } from '@playwright/test';

test.describe('Relatos Urbanos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('deve criar relato urbano via chat', async ({ page }) => {
    await page.goto('/?journey=urban_report');
    
    await page.fill('textarea[placeholder*="mensagem"]', 'Buraco na rua');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Como você avalia a gravidade')).toBeVisible({ timeout: 15000 });
    
    await page.fill('textarea', 'É urgente, muito grande');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Relato registrado')).toBeVisible({ timeout: 20000 });
  });

  test('deve visualizar histórico de relatos', async ({ page }) => {
    await page.goto('/relato-urbano/historico');
    
    await expect(page.locator('h1:has-text("Meus Relatos")')).toBeVisible();
  });

  test('deve adicionar comentário em relato', async ({ page }) => {
    await page.goto('/relato-urbano/historico');
    
    await page.click('[data-testid="report-card"]').first();
    await page.fill('textarea[placeholder*="comentário"]', 'Situação continua a mesma');
    await page.click('button:has-text("Comentar")');
    
    await expect(page.locator('text=Situação continua a mesma')).toBeVisible();
  });

  test('deve curtir um relato', async ({ page }) => {
    await page.goto('/relato-urbano/historico');
    
    const initialLikes = await page.locator('[data-testid="like-count"]').first().textContent();
    await page.click('[data-testid="like-button"]').first();
    
    await expect(page.locator('[data-testid="like-count"]').first()).not.toHaveText(initialLikes || '0');
  });
});
