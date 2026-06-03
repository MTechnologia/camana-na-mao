import { describe, expect, it, vi, afterEach } from "vitest";

describe("getOutgoingFieldHeuristicsMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("usa minimal com snapshot ativo por padrão", async () => {
    vi.stubEnv("VITE_DISABLE_LOCAL_FIELD_HEURISTICS", "");
    vi.stubEnv("VITE_ENABLE_FULL_LOCAL_FIELD_HEURISTICS", "");
    vi.stubEnv("VITE_DISABLE_JOURNEY_SNAPSHOT", "");
    const { getOutgoingFieldHeuristicsMode } = await import("@/hooks/chat/fieldHeuristicsGate");
    expect(getOutgoingFieldHeuristicsMode()).toBe("minimal");
  });

  it("retorna none quando VITE_DISABLE_LOCAL_FIELD_HEURISTICS=true", async () => {
    vi.stubEnv("VITE_DISABLE_LOCAL_FIELD_HEURISTICS", "true");
    const { getOutgoingFieldHeuristicsMode } = await import("@/hooks/chat/fieldHeuristicsGate");
    expect(getOutgoingFieldHeuristicsMode()).toBe("none");
  });

  it("retorna full quando VITE_ENABLE_FULL_LOCAL_FIELD_HEURISTICS=true", async () => {
    vi.stubEnv("VITE_DISABLE_LOCAL_FIELD_HEURISTICS", "");
    vi.stubEnv("VITE_ENABLE_FULL_LOCAL_FIELD_HEURISTICS", "true");
    const { getOutgoingFieldHeuristicsMode } = await import("@/hooks/chat/fieldHeuristicsGate");
    expect(getOutgoingFieldHeuristicsMode()).toBe("full");
  });
});
