/**
 * Hotfix — auto-reload em "Failed to fetch dynamically imported module".
 *
 * Quando um deploy substitui os chunks gerados pelo Vite, o `index.html` em
 * cache do navegador continua referenciando hashes antigos. O `React.lazy()`
 * tenta baixar um arquivo `assets/<chunk>-<hash>.js` que não existe mais e
 * resulta em tela branca + erro `Failed to fetch dynamically imported module`.
 *
 * Este utilitário ouve dois eventos para detectar a situação e força um reload
 * único da página, evitando o blank screen sem precisar do usuário dar F5:
 *
 *   1. `vite:preloadError` — disparado pelo Vite quando um preload falha.
 *   2. `unhandledrejection` — captura promises rejeitadas com mensagem
 *      "Failed to fetch dynamically imported module" / "ChunkLoadError".
 *
 * Usa `sessionStorage` para evitar loop infinito de reload quando o asset não
 * existir mesmo após recarregar (ex: o servidor está fora).
 */

const RELOADED_FLAG = "stale-chunk-reloaded";

const STALE_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "ChunkLoadError",
];

function looksLikeStaleChunk(message: string | undefined): boolean {
  if (!message) return false;
  return STALE_PATTERNS.some((p) => message.includes(p));
}

function reloadOnce(reason: string): void {
  if (typeof window === "undefined") return;
  // Já recarregamos uma vez nessa sessão? Se sim, não tenta de novo —
  // pode ser um problema real de servidor e o loop não vai resolver.
  try {
    if (window.sessionStorage?.getItem(RELOADED_FLAG)) {
      console.warn(
        "[handleStaleChunks] Erro de chunk após reload — provavelmente servidor offline ou bundle realmente quebrado",
        reason,
      );
      return;
    }
    window.sessionStorage?.setItem(RELOADED_FLAG, "1");
  } catch {
    // sessionStorage pode estar bloqueado; segue tentando reload mesmo assim
  }
  console.info("[handleStaleChunks] Bundle desatualizado detectado, recarregando…", reason);
  window.location.reload();
}

/** Inscreve listeners globais. Idempotente — chamar uma vez no main.tsx. */
export function installStaleChunkHandler(): void {
  if (typeof window === "undefined") return;

  // Vite dispara este evento quando um preload de chunk falha.
  window.addEventListener("vite:preloadError", (event) => {
    reloadOnce(`vite:preloadError ${(event as Event & { payload?: unknown }).payload || ""}`);
  });

  // Promises rejeitadas (caso do React.lazy + dynamic import).
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { message?: string } | undefined;
    if (looksLikeStaleChunk(reason?.message)) {
      event.preventDefault?.();
      reloadOnce(reason?.message || "unhandledrejection");
    }
  });

  // Erros gerais (chunk loader pode emitir como ErrorEvent em alguns browsers).
  window.addEventListener("error", (event) => {
    if (looksLikeStaleChunk(event.message)) {
      reloadOnce(event.message);
    }
  });
}
