import { test, expect } from "@playwright/test";
import { login, clearAuth } from "./_helpers/auth";

/**
 * HU-13.1 — Cobertura e2e do RBAC (HU-11).
 *
 * - Gestor NÃO acessa rotas admin-only (/admin/users, /admin/permissions, /admin/audit-logs)
 * - Admin acessa tudo
 * - Cidadão é redirecionado para fora de qualquer /admin
 * - Sidebar de admin/gestor mostra/oculta itens conforme permissão
 */

test.describe("RBAC — rotas admin-only", () => {
  test("admin acessa /admin/users", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator("body")).toContainText(/usuário|gestão de usuários/i);
  });

  test("admin acessa /admin/permissions (matriz)", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/permissions");
    await expect(page).toHaveURL(/\/admin\/permissions/);
    await expect(page.locator("body")).toContainText(/matriz de permissões|imutável|permissões/i);
  });

  test("admin acessa /admin/audit-logs", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/audit-logs");
    await expect(page).toHaveURL(/audit-logs/);
    await expect(page.locator("body")).toContainText(/imutável|logs de auditoria/i);
  });

  test("gestor é bloqueado em /admin/users (redirect)", async ({ page }) => {
    await login(page, "gestor");
    await page.goto("/admin/users");
    // Espera ser redirecionado para fora.
    await page.waitForURL(
      (url) => !url.pathname.startsWith("/admin/users"),
      { timeout: 10_000 },
    );
  });

  test("gestor é bloqueado em /admin/permissions", async ({ page }) => {
    await login(page, "gestor");
    await page.goto("/admin/permissions");
    await page.waitForURL(
      (url) => !url.pathname.startsWith("/admin/permissions"),
      { timeout: 10_000 },
    );
  });

  test("cidadão não acessa nenhum /admin/*", async ({ page }) => {
    await login(page, "cidadao");
    await page.goto("/admin");
    await page.waitForURL((url) => !url.pathname.startsWith("/admin"), {
      timeout: 10_000,
    });
  });

  test("sidebar do gestor não mostra 'Gestão de Usuários'", async ({ page }) => {
    await login(page, "gestor");
    await page.goto("/admin");

    // Item de Gestão de Usuários é admin-only.
    const usersLink = page.locator("nav, aside").locator("text=/gestão de usuários/i");
    await expect(usersLink).toHaveCount(0);
  });

  test("sidebar do admin mostra todos os itens críticos", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");

    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar).toContainText(/relatos/i);
    await expect(sidebar).toContainText(/triagem/i);
    await expect(sidebar).toContainText(/permissões/i);
    await expect(sidebar).toContainText(/logs de auditoria/i);
  });
});
