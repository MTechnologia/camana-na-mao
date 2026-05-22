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

    // Na barra de filtros o trigger usa label curto "Exportar" (≠ default "Exportar dados").
    const exportBtn = page
      .getByRole("button", { name: /exportar dados/i })
      .or(page.getByRole("button", { name: /^Exportar$/i }))
      .first();
    await expect(exportBtn).toBeVisible({ timeout: 15_000 });
    await exportBtn.click();

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
    const exportBtn = page.getByRole("button", { name: /exportar.*csv/i });

    // Não-admins são redirecionados; o botão só aparece após `useUserRole` terminar.
    for (let i = 0; i < 80; i++) {
      const url = page.url();
      if (!url.includes("/admin/audit-logs")) {
        test.skip(true, "Conta e2e sem role admin — /admin/audit-logs redireciona (RBAC)");
        return;
      }
      if (await exportBtn.isVisible().catch(() => false)) break;
      await page.waitForTimeout(100);
    }
    await expect(exportBtn).toBeVisible({ timeout: 25_000 });

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
