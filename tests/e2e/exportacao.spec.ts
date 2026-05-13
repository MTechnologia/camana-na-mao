import { test, expect } from "@playwright/test";
import { login } from "./_helpers/auth";

/**
 * HU-13.1 — Cobertura e2e de exportação (HU-7 + HU-12).
 *
 * - /admin/analytics: dialog DataExport → CSV/XLSX → confirma
 * - /admin/audit-logs: botão Exportar CSV → dispara download
 *
 * Captura o evento `download` do Playwright que dispara quando o
 * browser inicia salvamento de arquivo.
 */

test.describe("Exportação CSV/XLSX", () => {
  test("/admin/analytics: exportar CSV dispara download", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/analytics");

    const exportBtn = page.getByRole("button", { name: /exportar.*dados|exportar/i });
    await expect(exportBtn.first()).toBeVisible({ timeout: 15_000 });
    await exportBtn.first().click();

    // Espera o dialog abrir.
    const csvRadio = page.getByRole("radio", { name: /csv/i }).first();
    if (await csvRadio.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await csvRadio.check();
    }

    // Confirma download.
    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    const confirmBtn = page.getByRole("button", { name: /exportar|baixar|confirmar/i }).last();
    await confirmBtn.click();

    const download = await downloadPromise.catch(() => null);
    if (!download) {
      test.fail(true, "Download CSV não foi iniciado");
      return;
    }
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test("/admin/audit-logs: exportar CSV dispara download", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/audit-logs");
    await expect(page).toHaveURL(/audit-logs/);

    const exportBtn = page.getByRole("button", { name: /exportar.*csv/i });
    await expect(exportBtn).toBeVisible({ timeout: 15_000 });

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await exportBtn.click();
    const download = await downloadPromise.catch(() => null);
    if (!download) {
      test.fail(true, "Download de audit-logs CSV não iniciado");
      return;
    }
    expect(download.suggestedFilename()).toMatch(/^audit-logs.*\.csv$/);
  });
});
