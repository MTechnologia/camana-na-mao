import { describe, expect, it } from "vitest";
import {
  appendMessageByIdIfMissing,
  extractJourneySnapshotFromMetadata,
  shouldEnterLightJourney,
} from "./chatJourneyState";

describe("extractJourneySnapshotFromMetadata", () => {
  it("retorna snapshot válido de metadata", () => {
    const snapshot = extractJourneySnapshotFromMetadata({
      journey_snapshot: {
        schema_version: "journey_snapshot.v1",
        journey_type: "urban_report",
        fields: { category: "lixo" },
      },
    });
    expect(snapshot?.journey_type).toBe("urban_report");
    expect(snapshot?.fields?.category).toBe("lixo");
  });

  it("retorna null quando metadata inválida", () => {
    expect(extractJourneySnapshotFromMetadata(null)).toBeNull();
    expect(extractJourneySnapshotFromMetadata({ journey_snapshot: "x" })).toBeNull();
  });
});

describe("appendMessageByIdIfMissing", () => {
  it("não duplica mensagem com mesmo id", () => {
    const existing = [{ id: "m1", role: "user" }];
    const next = { id: "m1", role: "user" };
    const out = appendMessageByIdIfMissing(existing, next);
    expect(out).toHaveLength(1);
  });
});

describe("shouldEnterLightJourney", () => {
  it("bloqueia light journey quando há estruturada em andamento sem switch explícito", () => {
    const allow = shouldEnterLightJourney({
      currentCollectionType: "urban_report",
      validTrackerTypes: ["urban_report", "transport_report", "service_rating"],
      explicitSwitchToLight: false,
    });
    expect(allow).toBe(false);
  });

  it("permite light journey com switch explícito", () => {
    const allow = shouldEnterLightJourney({
      currentCollectionType: "urban_report",
      validTrackerTypes: ["urban_report", "transport_report", "service_rating"],
      explicitSwitchToLight: true,
    });
    expect(allow).toBe(true);
  });
});
