import { test, expect } from '@playwright/test';

test.describe('Avaliação de Serviços', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('deve avaliar serviço pendente', async ({ page }) => {
    await page.goto('/avaliar');
    
    // Clicar no serviço pendente
    await page.click('[data-testid="service-card"]').first();
    
    // Dar nota
    await page.click('[data-star="5"]');
    
    // Escrever avaliação
    await page.fill('textarea', 'Atendimento excelente, instalações limpas');
    
    await page.click('button:has-text("Enviar avaliação")');
    
    await expect(page.locator('text=Avaliação enviada')).toBeVisible();
  });

  test('deve encaminhar avaliação para vereador', async ({ page }) => {
    await page.goto('/avaliar');
    
    await page.click('[data-testid="service-card"]').first();
    await page.click('[data-star="5"]');
    await page.fill('textarea', 'Atendimento excelente');
    await page.click('button:has-text("Enviar avaliação")');
    
    await page.click('text=Encaminhar');
    await page.click('text=Selecionar vereador').first();
    await page.fill('textarea[placeholder*="motivo"]', 'Reconhecimento pelo bom trabalho');
    await page.click('button:has-text("Encaminhar")');
    
    await expect(page.locator('text=Encaminhamento realizado')).toBeVisible();
  });

  test('deve buscar serviços próximos', async ({ page }) => {
    await page.goto('/servicos-proximos');
    
    await expect(page.locator('h1:has-text("Serviços Próximos")')).toBeVisible();
    
    // Filtrar por UBS
    await page.click('button:has-text("UBS")');
    
    await expect(page.locator('[data-testid="service-marker"]')).toHaveCount(3, { timeout: 5000 });
  });
});
