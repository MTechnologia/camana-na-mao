import { test, expect } from '@playwright/test';

test.describe('Chat com IA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/home', { timeout: 10000 });
  });

  test('deve iniciar conversa com assistente geral', async ({ page }) => {
    await page.goto('/ia');
    
    await page.fill('textarea', 'Olá, preciso de ajuda');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Olá')).toBeVisible({ timeout: 15000 });
  });

  test('deve selecionar jornada específica', async ({ page }) => {
    await page.goto('/ia');
    
    // Selecionar jornada de transporte
    await page.click('text=Diagnóstico de Transporte');
    
    await expect(page.locator('text=Qual linha você utiliza')).toBeVisible();
  });

  test('deve salvar e retomar conversa', async ({ page }) => {
    await page.goto('/ia');
    
    // Iniciar conversa
    await page.fill('textarea', 'Teste de conversa');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Teste de conversa')).toBeVisible();
    
    // Navegar para outra página
    await page.goto('/home');
    
    // Voltar para IA
    await page.goto('/ia');
    
    // Verificar se conversa foi restaurada
    await expect(page.locator('text=Teste de conversa')).toBeVisible();
  });

  test('deve criar nova conversa', async ({ page }) => {
    await page.goto('/ia');
    
    await page.fill('textarea', 'Primeira mensagem');
    await page.click('button[type="submit"]');
    
    // Abrir menu de conversas
    await page.click('[data-testid="conversations-menu"]');
    await page.click('text=Nova conversa');
    
    // Verificar que chat está vazio
    await expect(page.locator('text=Primeira mensagem')).not.toBeVisible();
  });

  test('deve deletar conversa', async ({ page }) => {
    await page.goto('/ia');
    
    await page.fill('textarea', 'Mensagem para deletar');
    await page.click('button[type="submit"]');
    
    // Abrir menu de conversas
    await page.click('[data-testid="conversations-menu"]');
    
    // Deletar conversa
    await page.click('[data-testid="delete-conversation"]').first();
    await page.click('button:has-text("Confirmar")');
    
    await expect(page.locator('text=Conversa deletada')).toBeVisible();
  });
});
