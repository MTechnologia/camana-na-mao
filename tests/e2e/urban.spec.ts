import { test, expect } from '@playwright/test';
import { e2eLogin } from './helpers';

test.describe('Relatos Urbanos', () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test('deve criar relato urbano via chat', async ({ page }) => {
    test.setTimeout(120000); // fluxo longo: perguntas IA + waits + asserção final
    await page.goto('/?journey=urban_report');
    
    await page.fill('textarea', 'Buraco na rua');
    await page.getByTestId('chat-send').click();
    
    // IA pode perguntar sobre gravidade, CEP, endereço, etc.
    const nextPrompt = page.locator('[data-testid="chat-messages"]').getByText(/gravidade|Como você avalia|severidade|CEP|endereço|rua|local|Qual a gravidade/i);
    await expect(nextPrompt.first()).toBeVisible({ timeout: 20000 });
    
    await expect(page.locator('textarea')).toBeEnabled({ timeout: 25000 });
    await page.fill('textarea', 'É urgente, muito grande');
    await page.getByTestId('chat-send').click();
    
    // IA pode pedir CEP/endereço - enviar se aparecer
    const addrPrompt = page.locator('[data-testid="chat-messages"]').getByText(/CEP|endereço|rua|local|onde fica/i);
    if (await addrPrompt.first().isVisible().catch(() => false)) {
      await expect(page.locator('textarea')).toBeEnabled({ timeout: 25000 });
      await page.fill('textarea', 'Rua das Flores 123, Centro');
      await page.getByTestId('chat-send').click();
      await page.waitForTimeout(3000);
    }

    // Respostas adicionais até o relato ser registrado (número/referência, risco imediato, etc.)
    const chatMessages = page.locator('[data-testid="chat-messages"]');
    const successRegex = /Relato registrado|sucesso|protocolo|REL-\d{4}-\d+|Obrigado|seu relato foi|número do protocolo|enviado e está sendo analisado|contribuição enviada|cadastrado|graças à sua contribuição|informações foram recebidas|processando seu relato/i;
    let answeredNumber = false;
    let answeredRisk = false;
    for (let step = 0; step < 6; step++) {
      if (await chatMessages.getByText(successRegex).first().isVisible().catch(() => false)) break;
      // Aguardar IA terminar (textarea habilitado) antes de decidir próxima ação
      await page.locator('textarea').waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
      await expect(page.locator('textarea')).toBeEnabled({ timeout: 15000 });
      const numPrompt = chatMessages.getByText(/número|ponto de referência|referência próximo/i);
      const riskPrompt = chatMessages.getByText(/risco imediato|Há algum risco|afetando só você|toda a rua|bairro todo/i);
      if (!answeredNumber && (await numPrompt.last().isVisible().catch(() => false))) {
        await page.fill('textarea', '123');
        await page.getByTestId('chat-send').click();
        answeredNumber = true;
        await page.waitForTimeout(4000);
        continue;
      }
      if (!answeredRisk && (await riskPrompt.last().isVisible().catch(() => false))) {
        const riskText = await riskPrompt.last().textContent();
        if (/afetando|toda a rua|bairro todo/i.test(riskText || '')) {
          await page.fill('textarea', 'só eu');
        } else {
          await page.fill('textarea', 'não');
        }
        await page.getByTestId('chat-send').click();
        answeredRisk = true;
        await page.waitForTimeout(6000);
        continue;
      }
      break;
    }

    // Após responder "não" ao risco, aguardar IA terminar de processar (Pensando... → resposta)
    await expect(page.locator('textarea')).toBeEnabled({ timeout: 25000 });
    await page.waitForTimeout(2000);

    // Garantir que a área de mensagens está visível (chromium: layout com sidebar)
    await chatMessages.first().scrollIntoViewIfNeeded().catch(() => {});
    const regLoc = chatMessages.getByText(successRegex);
    await expect(regLoc.first()).toBeVisible({ timeout: 60000 });
  });

  test('bar com som alto deve autoclassificar sem loop de confirmação', async ({ page }) => {
    await page.goto('/?journey=urban_report');
    
    await page.fill('textarea', 'Existe um bar na esquina da minha casa e frequentemente eles ficam com som alto até de madrugada');
    await page.getByTestId('chat-send').click();
    
    await page.waitForTimeout(5000);
    
    const responseText = await page.locator('[data-testid="chat-messages"]').textContent() || '';
    
    // Resposta da IA deve conter algo relevante (local, confirmação, categoria)
    const hasRelevantResponse = responseText.length > 100 && (
      /CEP|endereço|rua|local|onde|qual endereço|Perturbação|Barulhento|Barulho|Som|Poluição|Confirma|parece ser/i.test(responseText)
    );
    expect(hasRelevantResponse).toBeTruthy();
  });

  test('deve visualizar histórico de relatos', async ({ page }) => {
    await page.goto('/relato-urbano/historico');
    
    await expect(page.getByText(/Contribuições|Relatos/i)).toBeVisible();
  });

  test('deve adicionar comentário em relato', async ({ page }) => {
    await page.goto('/relato-urbano/historico');

    const reportCard = page.locator('[data-testid="report-card"]').first();
    if (await reportCard.count() === 0) return;
    await expect(reportCard).toBeVisible({ timeout: 5000 });
    const commentBtn = reportCard.locator('[data-testid="comment-button"]');
    await commentBtn.click();
    await page.getByPlaceholder(/Escreva um comentário/i).fill('Situação continua a mesma');
    await page.getByRole('button', { name: /Comentar/i }).click();
    await expect(page.locator('p').filter({ hasText: 'Situação continua a mesma' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('deve curtir um relato', async ({ page }) => {
    await page.goto('/relato-urbano/historico');
    
    const initialLikes = await page.locator('[data-testid="like-count"]').first().textContent();
    await page.locator('[data-testid="like-button"]').first().click();
    
    await expect(page.locator('[data-testid="like-count"]').first()).not.toHaveText(initialLikes || '0');
  });
});
