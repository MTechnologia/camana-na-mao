/**
 * Telemetria leve de autenticação (NREF057).
 *
 * Registra eventos de auth — em especial LOGOUTS INESPERADOS — num buffer local
 * (localStorage, ring buffer) inspecionável, para diagnosticar "logout forçado"
 * sem depender de Sentry. Quando o Sentry entrar (backlog), estes breadcrumbs
 * podem ser encaminhados.
 *
 * Inspeção manual no console: `getAuthTelemetry()`.
 */

const STORAGE_KEY = "__cmsp_auth_telemetry__";
const MAX_ENTRIES = 30;

/** Marcado quando o logout parte do app/usuário, para não classificá-lo como inesperado. */
let intentionalSignOut = false;

export interface AuthBreadcrumb {
  ts: string;
  event: string; // SIGNED_OUT | TOKEN_REFRESHED | SIGNED_IN | INITIAL_SESSION | ...
  reason?: string; // SIGNED_OUT: "app_signout" | "unexpected"
  path?: string;
  online?: boolean;
  visibility?: string;
  /** Ainda há um token de sessão do Supabase no localStorage no momento do evento? */
  hasStoredSession?: boolean;
}

/** Chame ANTES de um signOut() iniciado pelo app/usuário. Consumido no próximo SIGNED_OUT. */
export function markIntentionalSignOut(): void {
  intentionalSignOut = true;
}

function read(): AuthBreadcrumb[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthBreadcrumb[]) : [];
  } catch {
    return [];
  }
}

function write(entries: AuthBreadcrumb[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // armazenamento indisponível — ignora
  }
}

/** Detecta se ainda existe um token de sessão do Supabase (`sb-*-auth-token`). */
function hasStoredSupabaseSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/** Registra um evento de auth no buffer. Em logout inesperado, também loga no console. */
export function recordAuthEvent(event: string): void {
  let reason: string | undefined;
  if (event === "SIGNED_OUT") {
    reason = intentionalSignOut ? "app_signout" : "unexpected";
    intentionalSignOut = false; // consome o flag
  }

  const crumb: AuthBreadcrumb = {
    ts: new Date().toISOString(),
    event,
    reason,
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
    online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
    visibility: typeof document !== "undefined" ? document.visibilityState : undefined,
    hasStoredSession: hasStoredSupabaseSession(),
  };

  const entries = read();
  entries.push(crumb);
  write(entries);

  if (event === "SIGNED_OUT" && reason === "unexpected") {
    console.warn("[auth-telemetry] Logout inesperado detectado", crumb);
  }
}

/** Retorna o histórico de breadcrumbs (para inspeção/diagnóstico). */
export function getAuthTelemetry(): AuthBreadcrumb[] {
  return read();
}

// Exposto para inspeção manual via console do navegador.
if (typeof window !== "undefined") {
  (window as unknown as { getAuthTelemetry?: typeof getAuthTelemetry }).getAuthTelemetry =
    getAuthTelemetry;
}
