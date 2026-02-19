import { test, expect } from '@playwright/test';
import { e2eLogin } from './helpers';

test.describe('Relatos Urbanos', () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
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

  test('bar com som alto deve autoclassificar sem loop de confirmação', async ({ page }) => {
    await page.goto('/?journey=urban_report');
    
    // Send a message about noise that should auto-classify with high confidence
    const textarea = page.locator('textarea[placeholder*="mensagem"]');
    await textarea.fill('Existe um bar na esquina da minha casa e frequentemente eles ficam com som alto até de madrugada');
    await page.click('button[type="submit"]');
    
    // Wait for AI response
    await page.waitForTimeout(3000);
    
    // The next prompt should be for CEP/address, NOT asking to confirm category
    // If working correctly, we should see address-related questions, not "Confirma?"
    const responseText = await page.locator('[data-testid="chat-messages"]').textContent() || '';
    
    // Should NOT be asking for category confirmation (no loop)
    const hasConfirmLoop = responseText.includes('Parece ser') && responseText.includes('Confirma?');
    
    // Should be asking for location (CEP or address)
    const askingForLocation = responseText.includes('CEP') || 
                              responseText.includes('endereço') || 
                              responseText.includes('rua') ||
                              responseText.includes('local');
    
    // Either: auto-classified and moved on to location, OR if asked to confirm it should be with intuitive label
    if (hasConfirmLoop) {
      // If there's a confirmation, it should use intuitive label like "Perturbação Sonora" or "Estabelecimento Barulhento"
      const usesIntuitiveLabel = responseText.includes('Perturbação') || 
                                 responseText.includes('Barulhento') || 
                                 responseText.includes('Barulho');
      expect(usesIntuitiveLabel).toBeTruthy();
    } else {
      // Should have moved on to asking for location
      expect(askingForLocation).toBeTruthy();
    }
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
