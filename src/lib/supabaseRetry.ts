type MaybeSupabaseError = {
  code?: string | null;
  message?: string | null;
};

export function isPoolTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as MaybeSupabaseError;
  return (
    e.code === "PGRST003" ||
    String(e.message || "")
      .toLowerCase()
      .includes("connection pool")
  );
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withPoolRetry<T>(
  operation: () => Promise<T>,
  options?: { retries?: number; baseDelayMs?: number },
): Promise<T> {
  const retries = options?.retries ?? 1;
  const baseDelayMs = options?.baseDelayMs ?? 600;

  let attempt = 0;
  let lastError: unknown = null;
  while (attempt <= retries) {
    try {
      return await operation();
    } catch (e) {
      lastError = e;
      if (!isPoolTimeoutError(e) || attempt === retries) {
        throw e;
      }
      const delay = baseDelayMs * (attempt + 1);
      await sleep(delay);
    }
    attempt += 1;
  }
  throw lastError;
}
