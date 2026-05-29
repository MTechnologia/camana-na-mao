import { describe, expect, it, vi, afterEach } from "vitest";

describe("shouldRunOutgoingFieldHeuristics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna true por padrão", async () => {
    vi.stubEnv("VITE_DISABLE_LOCAL_FIELD_HEURISTICS", "");
    vi.stubEnv("VITE_LOCAL_FIELD_HEURISTICS_MINIMAL", "");
    const { shouldRunOutgoingFieldHeuristics } = await import("@/hooks/chat/fieldHeuristicsGate");
    expect(shouldRunOutgoingFieldHeuristics()).toBe(true);
  });

  it("retorna false quando VITE_DISABLE_LOCAL_FIELD_HEURISTICS=true", async () => {
    vi.stubEnv("VITE_DISABLE_LOCAL_FIELD_HEURISTICS", "true");
    vi.resetModules();
    const { shouldRunOutgoingFieldHeuristics } = await import("@/hooks/chat/fieldHeuristicsGate");
    expect(shouldRunOutgoingFieldHeuristics()).toBe(false);
  });
});
