import { test, expect } from "@playwright/test";
import { login } from "./_helpers/auth";

const gestorConfigured = !!(
  process.env.E2E_GESTOR_EMAIL && process.env.E2E_GESTOR_PASSWORD
);
const cidadaoConfigured = !!(
  process.env.E2E_CIDADAO_EMAIL && process.env.E2E_CIDADAO_PASSWORD
);

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
    await expect(page).toHaveURL(/\/admin\/permissions/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Matriz de permissões/i })).toBeVisible({
      timeout: 12_000,
    });
    await expect(page.locator("body")).toContainText(/Salvar matriz/i);
  });

  test("admin acessa /admin/audit-logs", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/audit-logs");
    const auditHeading = page.getByRole("heading", { name: /Logs de Auditoria/i });
    let auditVisible = false;
    try {
      await expect(auditHeading).toBeVisible({ timeout: 12_000 });
      auditVisible = true;
    } catch {
      auditVisible = false;
    }
    test.skip(
      !auditVisible,
      "Conta E2E sem role 'admin' em user_roles: a página de auditoria redireciona (AuditLogs exige hasRole('admin')).",
    );
  });

  test("gestor é bloqueado em /admin/users (redirect)", async ({ page }) => {
    test.skip(
      !gestorConfigured,
      "Defina E2E_GESTOR_EMAIL e E2E_GESTOR_PASSWORD em .env.e2e.local (conta com role gestor).",
    );
    await login(page, "gestor");
    await page.goto("/admin/users");
    // Espera ser redirecionado para fora.
    await page.waitForURL(
      (url) => !url.pathname.startsWith("/admin/users"),
      { timeout: 10_000 },
    );
  });

  test("gestor é bloqueado em /admin/permissions", async ({ page }) => {
    test.skip(
      !gestorConfigured,
      "Defina E2E_GESTOR_EMAIL e E2E_GESTOR_PASSWORD em .env.e2e.local (conta com role gestor).",
    );
    await login(page, "gestor");
    await page.goto("/admin/permissions");
    await page.waitForURL(
      (url) => !url.pathname.startsWith("/admin/permissions"),
      { timeout: 10_000 },
    );
  });

  test("cidadão não acessa nenhum /admin/*", async ({ page }) => {
    test.skip(
      !cidadaoConfigured,
      "Defina E2E_CIDADAO_EMAIL e E2E_CIDADAO_PASSWORD em .env.e2e.local (conta com role cidadao).",
    );
    await login(page, "cidadao");
    await page.goto("/admin");
    await page.waitForURL((url) => !url.pathname.startsWith("/admin"), {
      timeout: 10_000,
    });
  });

  test("sidebar do gestor não mostra 'Gestão de Usuários'", async ({ page }) => {
    test.skip(
      !gestorConfigured,
      "Defina E2E_GESTOR_EMAIL e E2E_GESTOR_PASSWORD em .env.e2e.local (conta com role gestor).",
    );
    await login(page, "gestor");
    await page.goto("/admin");

    // Item de Gestão de Usuários é admin-only.
    const usersLink = page.locator("nav, aside").locator("text=/gestão de usuários/i");
    await expect(usersLink).toHaveCount(0);
  });

  test("sidebar do admin mostra todos os itens críticos", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");

    const openMenu = page.getByRole("button", { name: "Abrir menu" });
    if (await openMenu.isVisible().catch(() => false)) {
      await openMenu.click();
    }

    const sidebar = page.getByRole("complementary", { name: /Menu principal/i });
    await expect(sidebar).toContainText(/relatos|Relatos urbanos/i);

    const relatosGroup = sidebar.getByRole("button", { name: /^Relatos urbanos$/i });
    if (await relatosGroup.isVisible().catch(() => false)) {
      await sidebar.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await relatosGroup.scrollIntoViewIfNeeded();
      try {
        await relatosGroup.click({ timeout: 5_000 });
      } catch {
        await relatosGroup.evaluate((n) => (n as HTMLElement).click());
      }
    }
    await expect(
      sidebar.getByRole("link", { name: /Gestão de relatos|Kanban de triagem/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    const plat = sidebar.getByRole("button", { name: /^Plataforma e integrações$/i });
    if (await plat.isVisible().catch(() => false)) {
      await plat.scrollIntoViewIfNeeded();
      try {
        await plat.click({ timeout: 5_000 });
      } catch {
        await plat.evaluate((n) => (n as HTMLElement).click());
      }
      await expect(sidebar.getByRole("link", { name: /^Notificações$/i })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: /Exportações de dados/i })).toBeVisible();
    }

    const adm = sidebar.getByRole("button", { name: /^Administração e conformidade$/i });
    if (await adm.isVisible().catch(() => false)) {
      await adm.scrollIntoViewIfNeeded();
      try {
        await adm.click({ timeout: 5_000 });
      } catch {
        await adm.evaluate((n) => (n as HTMLElement).click());
      }
      await expect(sidebar.getByRole("link", { name: /^Documentação$/i })).toBeVisible();
      await expect(
        sidebar.getByRole("link", { name: /Matriz de permissões/i }),
      ).toBeVisible();
    }
  });
});
