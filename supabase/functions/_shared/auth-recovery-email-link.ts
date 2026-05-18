/** Caminho canônico da tela de nova senha após clique no e-mail de recovery. */
export const PASSWORD_RECOVERY_PATH = "/nova-senha";

export interface RecoveryEmailLinkInput {
  token_hash: string;
  redirect_to?: string | null;
  site_url?: string | null;
  app_public_url?: string | null;
}

/**
 * Escolhe a base HTTPS do app para o link de redefinição.
 * Prioridade: redirect_to do Auth → APP_PUBLIC_URL → site_url do projeto.
 */
export function resolvePasswordRecoveryRedirectBase(input: RecoveryEmailLinkInput): string {
  const candidates = [
    input.redirect_to?.trim(),
    input.app_public_url?.trim(),
    input.site_url?.trim(),
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    const normalized = tryNormalizeAppBase(raw);
    if (normalized) return normalized;
  }

  throw new Error("Unable to resolve password recovery redirect base URL");
}

function tryNormalizeAppBase(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}${PASSWORD_RECOVERY_PATH}`;
  } catch {
    return null;
  }
}

/**
 * Link único usado no botão e no texto alternativo do e-mail de recovery.
 * Evita URL longa do Supabase (/auth/v1/verify), que clientes de e-mail costumam
 * quebrar em vários links clicáveis diferentes.
 */
export function buildRecoveryEmailActionUrl(input: RecoveryEmailLinkInput): string {
  if (!input.token_hash?.trim()) {
    throw new Error("token_hash is required for recovery email link");
  }
  const base = resolvePasswordRecoveryRedirectBase(input);
  const url = new URL(base);
  url.searchParams.set("token_hash", input.token_hash);
  url.searchParams.set("type", "recovery");
  return url.toString();
}

export interface SupabaseVerifyLinkInput {
  supabase_url: string;
  token_hash: string;
  email_action_type: string;
  redirect_to?: string | null;
}

/** Link padrão do Auth (signup, magiclink, etc.) via endpoint verify do Supabase. */
export function buildSupabaseVerifyUrl(input: SupabaseVerifyLinkInput): string {
  const base = (input.supabase_url || "").replace(/\/$/, "");
  const params = new URLSearchParams({
    token: input.token_hash,
    type: input.email_action_type,
    redirect_to: input.redirect_to || "",
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}
