export async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (timedOut) {
      throw new Error(`Timeout após ${Math.round(timeoutMs / 1000)}s (sem resposta da API)`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

