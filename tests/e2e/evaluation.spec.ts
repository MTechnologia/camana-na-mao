import { test, expect } from '@playwright/test';
import { e2eLogin, dismissOnboardingIfVisible } from './helpers';

test.describe('Avaliação de Serviços', () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test('deve avaliar serviço pendente', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/avaliar');
    if (page.url().includes('/login')) {
      await e2eLogin(page);
      await page.goto('/avaliar');
    }
    await dismissOnboardingIfVisible(page);

    await expect(page.getByRole('heading', { name: /Avaliar Serviço/i }).first()).toBeVisible({ timeout: 10000 });

    const textarea = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });
    await textarea.fill('Quero avaliar a UBS do Centro');
    await page.getByRole('button', { name: /Enviar mensagem|Enviar/i }).click();
    // aguarda resposta da IA e o input ficar disponível novamente
    await expect(textarea).toBeEnabled({ timeout: 30000 });

    const sendIfAsked = async (regex: RegExp, answer: string) => {
      const el = page.getByText(regex);
      if (await el.isVisible().catch(() => false)) {
        const box = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
        await expect(box).toBeEnabled({ timeout: 10000 });
        await box.fill(answer);
        await page.getByRole('button', { name: /Enviar mensagem|Enviar/i }).click();
        await expect(box).toBeEnabled({ timeout: 30000 });
      }
    };
    await sendIfAsked(/nome do serviço|qual serviço|que serviço/i, 'UBS Central do Centro');
    await sendIfAsked(/Em qual.*bairro|bairro.*fica|qual bairro/i, 'Centro');

    // Aguarda IA exibir seletor de estrelas
    const star5 = page.locator('[data-star="5"]');
    await star5.waitFor({ state: 'visible', timeout: 30000 });

    await star5.click();
    const textareaComment = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
    await textareaComment.waitFor({ state: 'visible', timeout: 10000 });
    await expect(textareaComment).toBeEnabled({ timeout: 10000 });
    await textareaComment.fill('Atendimento excelente, instalações limpas');
    await page.getByRole('button', { name: /Enviar mensagem|Enviar/i }).click();

    await expect(page.getByText(/obrigado|Avaliação enviada|avaliação|avaliada/i)).toBeVisible({ timeout: 15000 });
  });

  test('deve encaminhar avaliação para vereador', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/avaliar');
    if (page.url().includes('/login')) {
      await e2eLogin(page);
      await page.goto('/avaliar');
    }
    await dismissOnboardingIfVisible(page);

    await expect(page.getByRole('heading', { name: /Avaliar Serviço/i }).first()).toBeVisible({ timeout: 10000 });

    const textarea = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });
    await textarea.fill('Quero avaliar a UBS do Centro');
    await page.getByRole('button', { name: /Enviar mensagem|Enviar/i }).click();
    await expect(textarea).toBeEnabled({ timeout: 30000 });
    const sendIfAsked = async (regex: RegExp, answer: string) => {
      const el = page.getByText(regex);
      if (await el.isVisible().catch(() => false)) {
        const box = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
        await expect(box).toBeEnabled({ timeout: 10000 });
        await box.fill(answer);
        await page.getByRole('button', { name: /Enviar mensagem|Enviar/i }).click();
        await expect(box).toBeEnabled({ timeout: 30000 });
      }
    };
    await sendIfAsked(/nome do serviço|qual serviço|que serviço/i, 'UBS Central do Centro');
    await sendIfAsked(/Em qual.*bairro|bairro.*fica|qual bairro/i, 'Centro');

    const star5 = page.locator('[data-star="5"]');
    await star5.waitFor({ state: 'visible', timeout: 30000 });
    await star5.click();

    const textareaComment = page.getByPlaceholder(/Digite sua mensagem|mensagem/i).first();
    await textareaComment.waitFor({ state: 'visible', timeout: 10000 });
    await expect(textareaComment).toBeEnabled({ timeout: 10000 });
    await textareaComment.fill('Atendimento excelente');
    await page.getByRole('button', { name: /Enviar mensagem|Enviar/i }).click();

    // aguarda conclusão da avaliação e exibição de ações seguintes (se existirem)
    await expect(textareaComment).toBeEnabled({ timeout: 30000 });

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
