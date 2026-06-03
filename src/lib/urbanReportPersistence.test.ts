import { describe, expect, it } from "vitest";
import {
  dbStatusToWorkflowStage,
  deriveUrbanWorkflowStage,
  stageToDbStatus,
} from "@/lib/urbanReportPersistence";
import { filterReportsForQueue } from "@/lib/urbanReportQueueFilters";
import type { UrbanReportRecord } from "@/types/urbanReportManagement";

function row(stage: UrbanReportRecord["stage"], id = "1"): UrbanReportRecord {
  return {
    id,
    protocol: "P1",
    title: "Test",
    summary: "",
    category: "c",
    region: "r",
    district: "d",
    stage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [],
  };
}

describe("urbanReportPersistence", () => {
  it("stageToDbStatus mapeia concluído para resolved", () => {
    expect(stageToDbStatus("resolved")).toBe("resolved");
    expect(stageToDbStatus("in_analysis")).toBe("in_progress");
    expect(stageToDbStatus("triaged")).toBe("in_progress");
  });

  it("dbStatusToWorkflowStage normaliza sinônimos", () => {
    expect(dbStatusToWorkflowStage("resolvido")).toBe("resolved");
    expect(dbStatusToWorkflowStage("in_progress")).toBe("in_analysis");
    expect(dbStatusToWorkflowStage("pending")).toBe("awaiting_triage");
  });

  it("deriveUrbanWorkflowStage diferencia triado sem envio de em encaminhamento", () => {
    expect(
      deriveUrbanWorkflowStage({
        dbStatus: "in_progress",
        formalTriagePriority: "P1",
        hasCommissionReferral: false,
        hasCouncilReferral: false,
      }),
    ).toBe("triaged");

    expect(
      deriveUrbanWorkflowStage({
        dbStatus: "in_progress",
        formalTriagePriority: "P1",
        hasCommissionReferral: true,
        hasCouncilReferral: false,
      }),
    ).toBe("referred");

    expect(
      deriveUrbanWorkflowStage({
        dbStatus: "resolved",
        formalTriagePriority: "P1",
        hasCommissionReferral: true,
        hasCouncilReferral: false,
      }),
    ).toBe("resolved");
  });
});

describe("urbanReportQueueFilters", () => {
  const sample = [
    row("awaiting_triage", "a"),
    row("triaged", "b"),
    row("in_analysis", "c"),
    row("resolved", "d"),
  ];

  it("KPI concluídos filtra apenas resolved", () => {
    const out = filterReportsForQueue(sample, "all", "resolved");
    expect(out.map((r) => r.id)).toEqual(["d"]);
  });

  it("KPI triados filtra apenas triaged", () => {
    const out = filterReportsForQueue(sample, "tracking", "triaged");
    expect(out.map((r) => r.id)).toEqual(["b"]);
  });

  it("aba Todos sem KPI retorna todos os estágios", () => {
    expect(filterReportsForQueue(sample, "all", null)).toHaveLength(4);
  });
});
