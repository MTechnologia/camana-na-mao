import { test, expect } from '@playwright/test';

test.describe('Audiências Públicas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/home', { timeout: 10000 });
  });

  test('deve listar audiências disponíveis', async ({ page }) => {
    await page.goto('/audiencias');
    
    await expect(page.locator('h1:has-text("Audiências Públicas")')).toBeVisible();
    await expect(page.locator('[data-testid="audiencia-card"]')).toHaveCount(3, { timeout: 5000 });
  });

  test('deve inscrever-se em audiência', async ({ page }) => {
    await page.goto('/audiencias');
    
    // Clicar na primeira audiência
    await page.click('[data-testid="audiencia-card"]').first();
    
    await expect(page.locator('h1')).toContainText('Audiência');
    
    await page.click('button:has-text("Inscrever-se")');
    
    await expect(page.locator('text=Inscrição confirmada')).toBeVisible();
  });

  test('deve filtrar audiências por tema', async ({ page }) => {
    await page.goto('/audiencias');
    
    await page.click('button:has-text("Filtros")');
    await page.click('text=Educação');
    
    await expect(page.locator('[data-testid="audiencia-card"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('deve cancelar inscrição', async ({ page }) => {
    await page.goto('/audiencias');
    
    // Inscrever primeiro
    await page.click('[data-testid="audiencia-card"]').first();
    await page.click('button:has-text("Inscrever-se")');
    await expect(page.locator('text=Inscrição confirmada')).toBeVisible();
    
    // Depois cancelar
    await page.click('button:has-text("Cancelar inscrição")');
    
    await expect(page.locator('text=Inscrição cancelada')).toBeVisible();
  });
});
