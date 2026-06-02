/** Mensagem exibida quando o banco atinge statement timeout. */
export const STATEMENT_TIMEOUT_ASSISTANT_MESSAGE =
  "O sistema demorou mais que o normal para responder. Por favor, aguarde alguns segundos e envie sua mensagem novamente.";

/** Corpo de erro da Edge (HTML/JSON) → texto útil em português. */
export function describeAiOrchestratorFailure(status: number, body: string): string {
  const b = body.trim();
  if (b.startsWith("{")) {
    try {
      const j = JSON.parse(b) as { code?: string; message?: string };
      if (
        j.code === "NOT_FOUND" ||
        /function was not found|not found/i.test(String(j.message ?? ""))
      ) {
        return "A função ai-orchestrator não foi encontrada neste projeto. Publique a Edge Function e confira CAMARA_URL / VITE_SUPABASE_URL.";
      }
      if (j.message) return j.message;
    } catch {
      /* ignore */
    }
  }
  if (status === 404 || /trouble finding the resource|requested function was not found/i.test(b)) {
    return "Serviço do assistente indisponível (404). Verifique o deploy de ai-orchestrator e se a URL do Supabase está correta.";
  }
  if (status === 401 || status === 403) {
    return "Sessão expirada ou sem permissão. Faça login novamente.";
  }
  if (b.length > 400) return `${b.slice(0, 400)}…`;
  return b || `Erro HTTP ${status}`;
}

export function isStatementTimeoutFailure(body: string): boolean {
  const b = body.trim();
  if (/canceling statement due to statement timeout/i.test(b)) return true;
  if (!b.startsWith("{")) return false;
  try {
    const j = JSON.parse(b) as { message?: string };
    return /canceling statement due to statement timeout/i.test(String(j.message ?? ""));
  } catch {
    return false;
  }
}

const FIELD_REQUEST_RE = /\[FIELD_REQUEST:(\w+)\]/;

export function extractFieldRequestFromContent(content: string): string | undefined {
  const match = content.match(FIELD_REQUEST_RE);
  return match?.[1];
}

/** Último marcador [FIELD_REQUEST:…] nas mensagens do assistente (mais recente primeiro). */
export function extractLastFieldRequestFromMessages(
  messages: Array<{ role: string; content: string }>,
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    const field = extractFieldRequestFromContent(msg.content);
    if (field) return field;
  }
  return null;
}

export function shouldIgnoreStaleCollectionProgress(params: {
  progressType: string;
  lastUserMessageContent: string;
}): boolean {
  const switchedTo = journeySwitchTarget(params.lastUserMessageContent);
  if (!switchedTo) return false;
  return params.progressType !== switchedTo;
}

function journeySwitchTarget(content: string): string | null {
  const match = content.match(/\[JOURNEY_SWITCHED:(\w+)\]/);
  return match?.[1] ?? null;
}

export function shouldRetryAfterRateLimit(
  storageKey: string,
  storage: Storage = sessionStorage,
): boolean {
  if (storage.getItem(storageKey)) return false;
  storage.setItem(storageKey, "1");
  return true;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const RATE_LIMIT_RETRY_DELAY_MS = 2000;

/** CHB-013: detecta passo de anexo de fotos sem depender só da copy fixa. */
export function isPhotoAttachStepContent(content: string): boolean {
  return (
    content.includes("[PHOTO_ATTACH_STEP]") ||
    content.includes("[FIELD_REQUEST:photos]") ||
    content.includes("Pode anexar até 3 fotos")
  );
}
