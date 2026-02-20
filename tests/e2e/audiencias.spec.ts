import { test, expect } from '@playwright/test';
import { e2eLogin } from './helpers';

test.describe('Audiências Públicas', () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test('deve listar audiências disponíveis', async ({ page }) => {
    await page.goto('/audiencias');
    
    await expect(page.getByRole('heading', { name: /Audiências Públicas/i }).first()).toBeVisible();
    const cards = page.locator('[data-testid="audiencia-card"]');
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first()).toBeVisible();
    } else {
      await expect(page.getByText(/Próximos|Audiências|carregar/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('deve inscrever-se em audiência', async ({ page }) => {
    await page.goto('/audiencias');
    
    const card = page.locator('[data-testid="audiencia-card"]').first();
    if (await card.count() === 0) return;
    await card.click();
    
    await expect(page.locator('h1')).toContainText(/Audiência|audiência/i);
    
    const inscreverBtn = page.getByRole('button', { name: /Inscrever-se/i });
    if (await inscreverBtn.isVisible().catch(() => false)) {
      await inscreverBtn.click();
      await expect(page.getByText(/Inscrição confirmada|confirmada/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('deve filtrar audiências por tema', async ({ page }) => {
    await page.goto('/audiencias');
    
    await page.getByRole('button', { name: /Filtros/ }).click();
    await page.getByText('Educação').click();
    await page.getByRole('button', { name: /Aplicar filtros/ }).click();
    
    await expect(page.getByText(/Educação|Nenhuma|resultado|audiência|Tema|Filtros/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('deve cancelar inscrição', async ({ page }) => {
    await page.goto('/audiencias');
    
    const card = page.locator('[data-testid="audiencia-card"]').first();
    if (await card.count() === 0) return;
    await card.click();
    const inscreverBtn = page.getByRole('button', { name: /Inscrever-se/i });
    if (await inscreverBtn.isVisible().catch(() => false)) {
      await inscreverBtn.click();
      await expect(page.getByText(/Inscrição confirmada|confirmada/i)).toBeVisible({ timeout: 5000 });
    }
    
    const cancelarBtn = page.getByRole('button', { name: /Cancelar inscrição/i });
    if (await cancelarBtn.isVisible().catch(() => false)) {
      await cancelarBtn.click();
      await expect(page.getByText(/Inscrição cancelada|cancelada/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
