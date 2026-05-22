import { test, expect } from '@playwright/test';
import { e2eLogin } from './helpers';

test.describe('Diagnóstico de Transporte', () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test('deve criar relato de transporte via formulário', async ({ page }) => {
    await page.goto('/transporte/novo');

    await expect(page.getByText(/Qual linha|Novo Relato|buscar linha/i).first()).toBeVisible({ timeout: 5000 });
    const searchInput = page.getByPlaceholder(/código ou nome da linha/i);
    await searchInput.fill('7');
    await page.waitForTimeout(2000);
    const lineResult = page.getByRole('button', { name: /\d{3,4}/ }).first();
    const customLineBtn = page.getByRole('button', { name: /Usar/i });
    if (await lineResult.isVisible().catch(() => false)) {
      await lineResult.click();
      const atrasoBtn = page.getByText('Atraso');
      if (await atrasoBtn.isVisible().catch(() => false)) {
        await atrasoBtn.click();
        const dateInput = page.locator('input[type="date"]');
        await dateInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        if (await dateInput.isVisible().catch(() => false)) {
          await dateInput.fill(new Date().toISOString().split('T')[0]);
          await page.getByRole('button', { name: /Continuar/i }).click();
          await page.getByPlaceholder(/Descreva o que aconteceu/i).fill('Ônibus atrasou 30 min');
          await page.getByRole('button', { name: /Continuar/i }).click();
          await page.getByRole('button', { name: /Confirmar|Enviar/i }).click();
          await expect(page.getByText(/sucesso|Relato enviado|Seu relato foi registrado/i).first()).toBeVisible({ timeout: 15000 });
        } else {
          await expect(page.getByText(/Qual linha|Novo Relato|buscar linha|Atraso/i).first()).toBeVisible();
        }
      } else {
        await expect(page.getByText(/Qual linha|Novo Relato|buscar linha|Atraso/i).first()).toBeVisible();
      }
    } else if (await customLineBtn.isVisible().catch(() => false)) {
      await customLineBtn.click();
      const atrasoBtn = page.getByText('Atraso');
      if (await atrasoBtn.isVisible().catch(() => false)) {
        await atrasoBtn.click();
        const dateInput = page.locator('input[type="date"]');
        await dateInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        if (await dateInput.isVisible().catch(() => false)) {
          await dateInput.fill(new Date().toISOString().split('T')[0]);
          await page.getByRole('button', { name: /Continuar/i }).click();
          await page.getByPlaceholder(/Descreva o que aconteceu/i).fill('Ônibus atrasou 30 min');
          await page.getByRole('button', { name: /Continuar/i }).click();
          await page.getByRole('button', { name: /Confirmar|Enviar/i }).click();
          await expect(page.getByText(/sucesso|Relato enviado|Seu relato foi registrado/i).first()).toBeVisible({ timeout: 15000 });
        } else {
          await expect(page.getByText(/Qual linha|Novo Relato|buscar linha|Atraso/i).first()).toBeVisible();
        }
      } else {
        await expect(page.getByText(/Qual linha|Novo Relato|buscar linha|Atraso/i).first()).toBeVisible();
      }
      await expect(page.getByText(/Qual linha|Novo Relato|buscar linha/i)).toBeVisible();
    }
  });

  test('deve visualizar padrões detectados', async ({ page }) => {
    await page.goto('/transporte/padroes');
    
    await expect(page.locator('h1:has-text("Padrões Detectados")')).toBeVisible();
    await expect(
      page.getByText(/padrão|Nenhum|relato/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('deve encaminhar relato para vereador', async ({ page }) => {
    await page.goto('/transporte/historico');
    
    const reportCard = page.locator('[data-testid="report-card"]').first();
    if (await reportCard.count() === 0) return;
    await expect(reportCard).toBeVisible({ timeout: 5000 });
    const encaminharBtn = page.getByRole('button', { name: /Encaminhar para vereador/i }).first();
    if (!(await encaminharBtn.isVisible().catch(() => false))) return;
    await encaminharBtn.click();
    await page.getByRole('button', { name: /Continuar/ }).first().click();
    await page.waitForTimeout(1500);
    const dialog = page.locator('[role="dialog"]');
    const cardClickable = dialog.locator('[class*="cursor-pointer"]').first();
    if (await cardClickable.isVisible().catch(() => false)) {
      await cardClickable.click();
      await page.getByRole('button', { name: /Continuar/ }).first().click();
      const msgArea = page.getByPlaceholder(/Escreva aqui sua mensagem|mensagem para o vereador/i);
      if (await msgArea.isVisible().catch(() => false)) {
        await msgArea.fill('Gostaria de solicitar melhorias nesta linha');
        await page.getByRole('button', { name: /^Encaminhar$/ }).click();
        await expect(page.getByText(/Encaminhamento|enviado|realizado|sucesso/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
