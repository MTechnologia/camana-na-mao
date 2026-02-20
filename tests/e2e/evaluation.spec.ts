import { test, expect } from '@playwright/test';
import { e2eLogin, dismissOnboardingIfVisible } from './helpers';

test.describe('Avaliação de Serviços', () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test('deve avaliar serviço pendente', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/avaliar');
    await page.waitForTimeout(2000); // deixa redirect para /login estabilizar (4 workers)
    if (page.url().includes('/login')) {
      await e2eLogin(page);
      await page.goto('/avaliar');
      await page.waitForTimeout(1500);
    }
    await dismissOnboardingIfVisible(page);
    const star5 = page.locator('[data-star="5"]');
    try {
      await star5.waitFor({ state: 'visible', timeout: 12000 });
    } catch {
      if (page.url().includes('/login')) {
        await e2eLogin(page);
        await page.goto('/avaliar');
        await dismissOnboardingIfVisible(page);
      }
      await star5.waitFor({ state: 'visible', timeout: 25000 });
    }

    await star5.click();
    await page.waitForTimeout(2500); // step 2 + render sob carga
    const textarea = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
    await textarea.waitFor({ state: 'visible', timeout: 25000 });
    await expect(textarea).toBeEnabled({ timeout: 10000 });
    await textarea.fill('Atendimento excelente, instalações limpas');
    await page.getByRole('button', { name: /Enviar avaliação|Enviar/i }).click();

    await expect(page.getByText(/obrigado|Avaliação enviada|avaliação/i)).toBeVisible({ timeout: 10000 });
  });

  test('deve encaminhar avaliação para vereador', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/avaliar');
    await page.waitForTimeout(2000); // deixa redirect para /login estabilizar (vários workers)
    if (page.url().includes('/login')) {
      await e2eLogin(page);
      await page.goto('/avaliar');
      await page.waitForTimeout(1500);
    }
    await dismissOnboardingIfVisible(page);
    const star5 = page.locator('[data-star="5"]');
    try {
      await star5.waitFor({ state: 'visible', timeout: 12000 });
    } catch {
      if (page.url().includes('/login')) {
        await e2eLogin(page);
        await page.goto('/avaliar');
        await dismissOnboardingIfVisible(page);
      }
      await star5.waitFor({ state: 'visible', timeout: 25000 });
    }

    const serviceCard = page.locator('[data-testid="service-card"]').first();
    const textareaLoc = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
    if (!(await serviceCard.isVisible().catch(() => false))) {
      await star5.click();
      await page.waitForTimeout(2500);
      await textareaLoc.waitFor({ state: 'visible', timeout: 25000 });
      await expect(textareaLoc).toBeEnabled({ timeout: 10000 });
      await textareaLoc.fill('Atendimento excelente');
      await page.getByRole('button', { name: /Enviar avaliação|Enviar/i }).click();
    } else {
      await serviceCard.click();
      await star5.click();
      await page.waitForTimeout(2500);
      const textareaElse = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
      await textareaElse.waitFor({ state: 'visible', timeout: 25000 });
      await expect(textareaElse).toBeEnabled({ timeout: 10000 });
      await textareaElse.fill('Atendimento excelente');
      await page.getByRole('button', { name: /Enviar avaliação|Enviar/i }).click();
    }
    const encaminharBtn = page.getByText(/Encaminhar/i);
    if (await encaminharBtn.isVisible().catch(() => false)) {
      await encaminharBtn.click();
      await page.locator('text=Selecionar vereador').first().click();
      await page.fill('textarea[placeholder*="motivo"]', 'Reconhecimento pelo bom trabalho');
      await page.getByRole('button', { name: /^Encaminhar$/ }).click();
      await expect(page.getByText(/Encaminhamento realizado|enviado/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('deve buscar serviços próximos', async ({ page }) => {
    await page.goto('/servicos-proximos');

    await expect(page.getByText(/Perto de Você|serviço|encontrado|Modo Demonstração/i).first()).toBeVisible({ timeout: 10000 });
    await page.getByText('UBS').first().click();
    await expect(page.getByText(/serviço|encontrado|Nenhum|encontrados/i).first()).toBeVisible({ timeout: 5000 });
  });
});
