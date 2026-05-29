import { describe, expect, it } from "vitest";
import { applyStreamCollectionProgress } from "@/hooks/chat/streamCollectionProgress";

describe("applyStreamCollectionProgress", () => {
  it("atualiza tipo estruturado válido", () => {
    const result = applyStreamCollectionProgress({
      progressType: "urban_report",
      fieldsJson: { category: "lixo" },
      lastUserMessageContent: "ok",
      currentCollectionType: null,
      currentLightJourneyType: null,
    });
    expect(result.collectionType).toBe("urban_report");
    expect(result.fieldsPatch).toEqual({ category: "lixo" });
  });

  it("ignora progress stale após troca de jornada", () => {
    const result = applyStreamCollectionProgress({
      progressType: "urban_report",
      fieldsJson: { category: "lixo" },
      lastUserMessageContent: "[JOURNEY_SWITCHED:transport_report] sim",
      currentCollectionType: "transport_report",
      currentLightJourneyType: null,
    });
    expect(result.ignoredStale).toBe(true);
    expect(result.fieldsPatch).toBeNull();
  });
});
