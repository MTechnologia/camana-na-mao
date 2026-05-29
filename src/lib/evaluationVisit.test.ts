import { describe, expect, it } from "vitest";
import { evaluationVisitErrorMessage, validateEvaluationVisit } from "./evaluationVisit";

describe("validateEvaluationVisit", () => {
  it("aceita visita pendente dentro do prazo", () => {
    expect(
      validateEvaluationVisit(
        { id: "v1", status: "pending", expires_at: new Date(Date.now() + 60_000).toISOString() },
      ).ok,
    ).toBe(true);
  });

  it("rejeita visita expirada", () => {
    const result = validateEvaluationVisit({
      id: "v1",
      status: "pending",
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(evaluationVisitErrorMessage(result.reason)).toMatch(/prazo/i);
    }
  });

  it("rejeita visita já concluída", () => {
    const result = validateEvaluationVisit({ id: "v1", status: "completed" });
    expect(result.ok).toBe(false);
  });
});
