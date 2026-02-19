import { test, expect } from '@playwright/test';
import { e2eLogin } from './helpers';

test.describe('Diagnóstico de Transporte', () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test('deve criar relato de transporte via formulário', async ({ page }) => {
    await page.goto('/transporte/novo');
    
    // Preencher formulário
    await page.click('input[placeholder*="linha"]');
    await page.fill('input[placeholder*="linha"]', '7119');
    await page.click('text=7119');
    
    await page.click('text=Atraso');
    await page.fill('textarea', 'Ônibus atrasou mais de 30 minutos');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Relato enviado com sucesso')).toBeVisible();
  });

  test('deve visualizar padrões detectados', async ({ page }) => {
    await page.goto('/transporte/padroes');
    
    await expect(page.locator('h1:has-text("Padrões Detectados")')).toBeVisible();
    await expect(page.locator('[data-testid="pattern-card"]').first()).toBeVisible();
  });

  test('deve encaminhar relato para vereador', async ({ page }) => {
    await page.goto('/transporte/meus-relatos');
    
    // Clicar no primeiro relato
    await page.click('[data-testid="report-card"]').first();
    
    await page.click('text=Encaminhar');
    await page.fill('textarea', 'Gostaria de solicitar melhorias nesta linha');
    await page.click('button:has-text("Enviar")');
    
    await expect(page.locator('text=Encaminhamento enviado')).toBeVisible();
  });
});
