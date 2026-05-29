import { describe, expect, it } from "vitest";
import {
  describeAiOrchestratorFailure,
  extractFieldRequestFromContent,
  extractLastFieldRequestFromMessages,
  isStatementTimeoutFailure,
  shouldIgnoreStaleCollectionProgress,
  isPhotoAttachStepContent,
  shouldRetryAfterRateLimit,
} from "./chatOrchestratorClient";

describe("describeAiOrchestratorFailure", () => {
  it("traduz 404 de função não encontrada", () => {
    const msg = describeAiOrchestratorFailure(404, "Requested function was not found");
    expect(msg).toMatch(/ai-orchestrator/i);
  });

  it("traduz sessão expirada", () => {
    expect(describeAiOrchestratorFailure(401, "")).toMatch(/login/i);
  });
});

describe("isStatementTimeoutFailure", () => {
  it("detecta timeout em texto plano", () => {
    expect(
      isStatementTimeoutFailure("canceling statement due to statement timeout"),
    ).toBe(true);
  });

  it("detecta timeout em JSON", () => {
    expect(
      isStatementTimeoutFailure(
        JSON.stringify({ message: "canceling statement due to statement timeout" }),
      ),
    ).toBe(true);
  });
});

describe("extractFieldRequestFromContent", () => {
  it("extrai nome do campo", () => {
    expect(
      extractFieldRequestFromContent("[FIELD_REQUEST:affected_scope]Quem mais?"),
    ).toBe("affected_scope");
  });
});

describe("extractLastFieldRequestFromMessages", () => {
  it("retorna o último FIELD_REQUEST do assistente", () => {
    const field = extractLastFieldRequestFromMessages([
      { role: "assistant", content: "[FIELD_REQUEST:description]Descreva" },
      { role: "user", content: "buraco" },
      { role: "assistant", content: "[FIELD_REQUEST:category]Tema?" },
    ]);
    expect(field).toBe("category");
  });
});

describe("shouldIgnoreStaleCollectionProgress", () => {
  it("ignora progresso de jornada antiga após switch explícito", () => {
    const ignore = shouldIgnoreStaleCollectionProgress({
      progressType: "urban_report",
      lastUserMessageContent: "Sim [JOURNEY_SWITCHED:transport_report]",
    });
    expect(ignore).toBe(true);
  });

  it("aceita progresso quando coincide com jornada escolhida", () => {
    const ignore = shouldIgnoreStaleCollectionProgress({
      progressType: "transport_report",
      lastUserMessageContent: "[JOURNEY_SWITCHED:transport_report]",
    });
    expect(ignore).toBe(false);
  });
});

describe("isPhotoAttachStepContent", () => {
  it("detecta marcador estruturado e copy legada", () => {
    expect(isPhotoAttachStepContent("[PHOTO_ATTACH_STEP]Anexe fotos")).toBe(true);
    expect(isPhotoAttachStepContent("Pode anexar até 3 fotos")).toBe(true);
    expect(isPhotoAttachStepContent("Qual o CEP?")).toBe(false);
  });
});

describe("shouldRetryAfterRateLimit", () => {
  it("permite apenas uma tentativa por chave", () => {
    const storage = {
      store: {} as Record<string, string>,
      getItem(k: string) {
        return this.store[k] ?? null;
      },
      setItem(k: string, v: string) {
        this.store[k] = v;
      },
    };
    expect(shouldRetryAfterRateLimit("rl-test", storage as Storage)).toBe(true);
    expect(shouldRetryAfterRateLimit("rl-test", storage as Storage)).toBe(false);
  });
});
