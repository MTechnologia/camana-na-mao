import { afterEach, describe, expect, it, vi } from "vitest";
import { withTimeout } from "./promiseTimeout";

describe("withTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolve com o valor original quando a promise termina antes do prazo", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1000)).resolves.toBe("ok");
  });

  it("propaga rejeicao da promise original", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 1000)).rejects.toThrow("boom");
  });

  it("rejeita com a mensagem configurada quando o prazo expira", async () => {
    vi.useFakeTimers();
    const result = withTimeout(new Promise<string>(() => undefined), 100, "demorou");

    vi.advanceTimersByTime(100);

    await expect(result).rejects.toThrow("demorou");
  });
});
