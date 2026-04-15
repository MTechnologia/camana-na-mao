import { test, expect } from '@playwright/test';
import { e2eLogin, dismissOnboardingIfVisible } from './helpers';

/**
 * HU-10.3 — Encaminhamento automático (wizard urbano: comissão opcional → sugestão → vereador).
 * Requer relato próprio no histórico e perfil com permissão (Cidadão Engajado / Gestor / Admin).
 */
test.describe('Encaminhamento (referral automático)', () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test('histórico urbano: wizard com “Pular — sugestão automática” até encaminhar', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/relato-urbano/historico');
    await dismissOnboardingIfVisible(page);

    await expect(page.getByText(/Contribuições|Relatos|histórico/i).first()).toBeVisible({ timeout: 20000 });

    const encaminhar = page.getByRole('button', { name: /Encaminhar para vereador/i });
    if ((await encaminhar.count()) === 0) {
      test.skip(
        true,
        'Sem relato próprio no histórico ou botão indisponível (permissão / dados).',
      );
    }

    await encaminhar.first().click();

    const dialog = page.getByRole('dialog');

    const restrito = page.getByText(/Acesso restrito|Cidadão Engajado/i);
    if (await restrito.isVisible().catch(() => false)) {
      test.skip(true, 'Utilizador E2E sem permissão para encaminhar a vereador.');
    }

    await expect(dialog.getByText(/Revisar Relato|Comissão da Câmara/i).first()).toBeVisible({ timeout: 20000 });

    await dialog.getByRole('button', { name: /Continuar/i }).first().click();

    await dialog.getByRole('button', { name: /Pular — sugestão automática/i }).click();

    await expect(dialog.getByText(/Escolher Vereador/i)).toBeVisible({ timeout: 60000 });

    const nenhum = dialog.getByText(/Nenhum vereador sugerido/i);
    if (await nenhum.isVisible().catch(() => false)) {
      test.skip(true, 'Sem sugestões de vereador no ambiente (dados ou API).');
    }

    await dialog.getByRole('heading', { level: 3 }).first().click();

    await dialog.getByRole('button', { name: /^Continuar$/i }).click();

    await expect(
      dialog.getByPlaceholder(/Escreva aqui sua mensagem para o vereador/i),
    ).toBeVisible({ timeout: 15000 });

    await dialog.getByRole('button', { name: /^Encaminhar$/i }).click();

    await expect(
      dialog.getByText(/Relato Encaminhado|Encaminhamento realizado|enviado/i).first(),
    ).toBeVisible({
      timeout: 20000,
    });
  });
});
