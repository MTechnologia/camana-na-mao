/**
 * Credenciais do usuário de teste para E2E.
 * O login só funciona se este usuário existir no Supabase do ambiente (Authentication > Users)
 * e tiver o e-mail confirmado.
 *
 * O Playwright carrega .env.e2e.local (raiz do projeto) ao iniciar. Crie esse arquivo a partir
 * de .env.e2e.example com um usuário válido do seu Supabase. Ou defina no ambiente:
 *   E2E_TEST_EMAIL e E2E_TEST_PASSWORD
 */

const rawEmail = process.env.E2E_TEST_EMAIL;
const rawPassword = process.env.E2E_TEST_PASSWORD;

export const E2E_TEST_EMAIL = rawEmail ?? "test@example.com";
export const E2E_TEST_PASSWORD = rawPassword ?? "Test@123456";

// Aviso se estiver usando credenciais de fallback (login quase certamente falhará)
if (!rawEmail || !rawPassword) {
  console.warn(
    "[E2E] Credenciais de fallback em uso. Crie .env.e2e.local com E2E_TEST_EMAIL e E2E_TEST_PASSWORD " +
      "de um usuário existente e confirmado no Supabase (mesmo projeto do .env)."
  );
}
