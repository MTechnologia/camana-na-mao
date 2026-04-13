/**
 * HTTP para API Escola Aberta (ApiLib): timeout, retries e mensagens de erro legíveis.
 * Usado pelos scripts sync-escolaaberta-*.mjs
 */

/** Desembrulha cause chain do fetch/undici (ex.: "fetch failed" + ETIMEDOUT). */
export function formatFetchError(err) {
  if (err == null) return "erro desconhecido";
  const parts = [];
  let cur = err;
  for (let i = 0; i < 10 && cur; i++) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
    } else if (typeof cur === "object" && cur !== null) {
      const code = cur.code ?? cur.syscall;
      if (code) parts.push(`code=${code}`);
      if (cur.address) parts.push(`host=${cur.address}`);
      if (cur.port) parts.push(`port=${cur.port}`);
      break;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return parts.filter(Boolean).join(" ← ");
}

/**
 * fetch com timeout e várias tentativas (rede instável ou bloqueio intermitente).
 * Env: ESCOLA_ABERTA_FETCH_RETRIES (default 4), ESCOLA_ABERTA_FETCH_TIMEOUT_MS (120000), ESCOLA_ABERTA_FETCH_RETRY_DELAY_MS (3000)
 */
export async function fetchWithRetry(url, init = {}, options = {}) {
  const retries = Number(
    process.env.ESCOLA_ABERTA_FETCH_RETRIES || options.retries || 4,
  );
  const timeoutMs = Number(
    process.env.ESCOLA_ABERTA_FETCH_TIMEOUT_MS || options.timeoutMs || 120_000,
  );
  const baseDelayMs = Number(
    process.env.ESCOLA_ABERTA_FETCH_RETRY_DELAY_MS || options.baseDelayMs || 3000,
  );

  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res;
    } catch (e) {
      lastErr = e;
      const detail = formatFetchError(e);
      console.warn(
        `[Escola Aberta HTTP] tentativa ${attempt}/${retries} falhou: ${detail}`,
      );
      if (attempt < retries) {
        const wait = baseDelayMs * attempt;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}
