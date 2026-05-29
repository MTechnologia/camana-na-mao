import { describe, expect, it } from "vitest";
import {
  isOpenManualReportMessage,
  OPEN_MANUAL_REPORT_MESSAGE,
  resolveManualReportPath,
} from "@/lib/manualReportNavigation";

describe("manualReportNavigation", () => {
  it("resolve rotas por jornada", () => {
    expect(resolveManualReportPath("urban_report")).toBe("/relato-urbano/manual");
    expect(resolveManualReportPath("transport_report")).toBe("/transporte/novo");
    expect(resolveManualReportPath(null)).toBe("/relato-urbano/manual");
  });

  it("detecta marcador do chip", () => {
    expect(isOpenManualReportMessage(OPEN_MANUAL_REPORT_MESSAGE)).toBe(true);
    expect(isOpenManualReportMessage("  [OPEN_MANUAL_REPORT]  ")).toBe(true);
  });
});
