import { expect, type Page } from "@playwright/test";

/**
 * HU-13.1 — Helpers de autenticação para testes e2e.
 *
 * Cada role tem credenciais pré-criadas em `.env.e2e.local`:
 *
 *   E2E_ADMIN_EMAIL=...
 *   E2E_ADMIN_PASSWORD=...
 *   E2E_GESTOR_EMAIL=...
 *   E2E_GESTOR_PASSWORD=...
 *   E2E_ASSESSOR_EMAIL=...
 *   E2E_ASSESSOR_PASSWORD=...
 *   E2E_CIDADAO_EMAIL=...
 *   E2E_CIDADAO_PASSWORD=...
 *
 * Compatível com `.env.e2e.example`: se `E2E_ADMIN_*` não estiver definido, o role **admin**
 * usa `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` (mesmo par usado por `e2eLogin()` nos outros specs).
 *
 * As contas devem existir no Supabase de teste com os roles correspondentes
 * em `user_roles`. Veja `tests/e2e/README.md` para setup inicial.
 */

export type E2ERole = "admin" | "gestor" | "assessor" | "cidadao";

function getCredentials(role: E2ERole): { email: string; password: string } {
  const env = process.env;
  const map: Record<E2ERole, { emailKey: string; pwKey: string }> = {
    admin: { emailKey: "E2E_ADMIN_EMAIL", pwKey: "E2E_ADMIN_PASSWORD" },
    gestor: { emailKey: "E2E_GESTOR_EMAIL", pwKey: "E2E_GESTOR_PASSWORD" },
    assessor: { emailKey: "E2E_ASSESSOR_EMAIL", pwKey: "E2E_ASSESSOR_PASSWORD" },
    cidadao: { emailKey: "E2E_CIDADAO_EMAIL", pwKey: "E2E_CIDADAO_PASSWORD" },
  };
  const { emailKey, pwKey } = map[role];
  const email =
    env[emailKey] ?? (role === "admin" ? env.E2E_TEST_EMAIL : undefined);
  const password =
    env[pwKey] ?? (role === "admin" ? env.E2E_TEST_PASSWORD : undefined);
  if (!email || !password) {
    const adminFallbackHint =
      role === "admin"
        ? " (ou E2E_TEST_EMAIL / E2E_TEST_PASSWORD, como em .env.e2e.example)"
        : "";
    throw new Error(
      `Credenciais ${role} ausentes. Defina ${emailKey} e ${pwKey}${adminFallbackHint} em .env.e2e.local`,
    );
  }
  return { email, password };
}

/**
 * Faz login via UI clássica de email/senha. Aguarda redirecionamento para
 * a home (`/`) que indica sessão estabelecida.
 */
export async function login(page: Page, role: E2ERole): Promise<void> {
  const { email, password } = getCredentials(role);
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Senha").fill(password);
  await page.getByRole("button", { name: /Continuar|Entrando/i }).click();
  // Pós-login: home, onboarding ou welcome (fluxo varia por confirmação de e-mail / primeiro acesso)
  await page.waitForURL(/\/(|onboarding|welcome)$/, { timeout: 15_000 });
}

/**
 * Atalho que loga e navega para uma rota admin. Lança se a navegação for
 * bloqueada (útil pra testes de RBAC).
 */
export async function loginAndGoto(
  page: Page,
  role: E2ERole,
  targetPath: string,
  options: { expectRedirect?: boolean } = {},
): Promise<void> {
  await login(page, role);
  await page.goto(targetPath);
  if (options.expectRedirect) {
    // Para testes negativos: espera não conseguir ficar na rota.
    await page.waitForURL((url) => !url.pathname.startsWith(targetPath), {
      timeout: 10_000,
    });
  } else {
    await expect(page).toHaveURL(new RegExp(`^${targetPath.replace(/\//g, "\\/")}`));
  }
}

/**
 * Limpa storage e cookies entre testes para garantir isolamento.
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_e) {
      // ignore
    }
  });
}
