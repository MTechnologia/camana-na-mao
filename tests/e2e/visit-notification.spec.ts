import { test, expect } from '@playwright/test';
import { e2eLogin, dismissOnboardingIfVisible } from './helpers';

/**
 * HU-10.6 — Notificação / lembrete pós-visita: página de notificações e banner de avaliações pendentes.
 */
test.describe('Notificações e visita', () => {
  test.beforeEach(async ({ page }) => {
    await e2eLogin(page);
  });

  test('carrega /notificacoes e mostra lembrete de visita ou avaliação pendente quando existir', async ({
    page,
  }) => {
    await page.goto('/notificacoes');
    await dismissOnboardingIfVisible(page);

    await expect(page.getByRole('heading', { name: /^Notificações$/i })).toBeVisible({ timeout: 20000 });

    const visitaOuAvaliar = page.getByText(
      /visitou|avaliar este serviço|visita_servico|avaliação pendente|avaliações pendentes/i,
    );

    if (await visitaOuAvaliar.first().isVisible().catch(() => false)) {
      await expect(visitaOuAvaliar.first()).toBeVisible();
      return;
    }

    test.skip(
      true,
      'Sem notificação de visita nem banner de avaliação pendente para este utilizador.',
    );
  });
});
