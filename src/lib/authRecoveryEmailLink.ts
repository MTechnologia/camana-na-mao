/**
 * Espelha supabase/functions/_shared/auth-recovery-email-link.ts para testes no Vitest.
 */

export const PASSWORD_RECOVERY_PATH = "/nova-senha";

export interface RecoveryEmailLinkInput {
  token_hash: string;
  redirect_to?: string | null;
  site_url?: string | null;
  app_public_url?: string | null;
}

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

const MOBILE_RECOVERY_SCHEME = "camaranaomao://nova-senha";

function tryNormalizeMobileRecoveryBase(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "camaranaomao:") return null;
    if (url.hostname === "nova-senha") return MOBILE_RECOVERY_SCHEME;
    return null;
  } catch {
    return null;
  }
}

function tryNormalizeAppBase(raw: string): string | null {
  const mobile = tryNormalizeMobileRecoveryBase(raw);
  if (mobile) return mobile;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}${PASSWORD_RECOVERY_PATH}`;
  } catch {
    return null;
  }
}

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
