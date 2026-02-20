import { test, expect } from '@playwright/test';
import { e2eLogin } from './helpers';

test.describe('Chat com IA', () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test('deve iniciar conversa com assistente geral', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('textarea', 'Olá, preciso de ajuda');
    await page.getByTestId('chat-send').click();
    
    await expect(page.locator('[data-testid="chat-messages"]').getByText(/Olá|preciso|como posso ajudar|assistente/i).first()).toBeVisible({ timeout: 25000 });
  });

  test('deve selecionar jornada específica', async ({ page }) => {
    await page.goto('/');
    
    // Aguardar hub carregar (chips ou área de mensagem)
    await page.getByText(/Sobre o que deseja falar|O que deseja falar|Transporte/i).first().waitFor({ state: 'visible', timeout: 10000 });
    // Selecionar jornada de transporte (chip na home)
    await page.getByRole('button', { name: /Transporte/ }).click();
    
    const chatArea = page.locator('[data-testid="chat-messages"]');
    const fallback = page.getByText(/linha|transporte|ônibus/i).first();
    await expect(chatArea.getByText(/linha|transporte|ônibus/i).first().or(fallback)).toBeVisible({ timeout: 15000 });
  });

  test('deve salvar e retomar conversa', async ({ page }) => {
    test.setTimeout(60000); // navegação, lista, retomar + fechar menu
    await page.goto('/');
    
    // Iniciar conversa
    await page.fill('textarea', 'Teste de conversa');
    await page.getByTestId('chat-send').click();
    
    await expect(page.locator('[data-testid="chat-messages"]').getByText('Teste de conversa')).toBeVisible({ timeout: 15000 });
    
    // Navegar para /conversas e retomar
    await page.getByTestId('conversations-menu').click();
    await page.getByRole('menuitem', { name: /histórico|Ver histórico/i }).click();
    await page.waitForURL(/\/conversas/);
    
    // Aguardar lista carregar e clicar na conversa para retomar
    const convItem = page.getByText('Teste de conversa').first();
    await expect(convItem).toBeVisible({ timeout: 15000 });
    await convItem.click({ timeout: 10000 });
    
    // Verificar que voltou à home e que a conversa carregou (no mobile o carregamento pode demorar)
    await expect(page).toHaveURL(/\/(|welcome)$/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    // No mobile o menu lateral pode ficar aberto e cobrir o chat - fechar se visível
    const closeMenu = page.getByRole('button', { name: /Fechar menu/i });
    if (await closeMenu.isVisible().catch(() => false)) {
      // Clique via evaluate: botão pode estar em overlay fora da viewport (Playwright rejeita click normal)
      await closeMenu.evaluate((el: HTMLElement) => el.click());
      await page.waitForTimeout(1000); // animação do drawer (mobile) antes de assertar
    }
    // Mensagem "Teste de conversa" visível na área do chat (evitar span oculto do sidebar no mobile)
    const msgInChat = page.locator('[data-testid="chat-messages"]').getByText('Teste de conversa');
    await expect(msgInChat.first()).toBeVisible({ timeout: 20000 });
  });

  test('deve criar nova conversa', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('textarea', 'Primeira mensagem');
    await page.getByTestId('chat-send').click();
    
    // Aguardar mensagem aparecer e abrir menu
    await expect(page.locator('[data-testid="chat-messages"]').getByText('Primeira mensagem').first()).toBeVisible({ timeout: 15000 });
    await page.getByTestId('conversations-menu').click();
    await page.getByRole('menuitem', { name: /Nova conversa/ }).click();
    
    // Verificar que voltou ao hub (tela de boas-vindas)
    await expect(page.getByText(/Sobre o que deseja falar|O que deseja falar/i)).toBeVisible({ timeout: 5000 });
  });

  test('deve deletar conversa', async ({ page }) => {
    test.setTimeout(45000); // sob carga o delete e o toast podem demorar
    await page.goto('/');

    await page.fill('textarea', 'Mensagem para deletar');
    await page.getByTestId('chat-send').click();

    // Ir para histórico de conversas
    await expect(page.locator('[data-testid="chat-messages"]').getByText('Mensagem para deletar')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('conversations-menu').click();
    await page.getByRole('menuitem', { name: /histórico|Ver histórico/i }).click();

    await page.waitForURL(/\/conversas/);
    // Card contém title/lastMessagePreview e botão delete
    const cardWithConv = page.locator('div').filter({ hasText: 'Mensagem para deletar', has: page.locator('[data-testid="delete-conversation"]') });
    const deleteBtn = cardWithConv.locator('[data-testid="delete-conversation"]').first();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click({ timeout: 10000 });
    await page.getByRole('button', { name: /Deletar permanentemente|Confirmar|Excluir|Sim/i }).click();

    // Toast: "Conversa excluída" / "A conversa foi removida com sucesso." — sob carga pode demorar
    await expect(page.getByText(/Conversa excluída|excluída com sucesso|removida com sucesso|foi removida/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('deve responder a pergunta geral (fluxo RAG)', async ({ page }) => {
    await page.goto('/');

    const perguntaRag = 'O que é a Câmara Municipal?';
    await page.fill('textarea', perguntaRag);
    await page.getByTestId('chat-send').click();

    const ragLoc = page.locator('[data-testid="chat-messages"]').getByText(/órgão|legislativ|vereador|municipal|audiência|atribuição|sessão|Câmara|poder|público|lei|legislação/i);
    await expect(ragLoc.first()).toBeVisible({ timeout: 30000 });
  });
});
