import { describe, expect, it } from "vitest";
import {
  buildManualReportNavigateOptions,
  isOpenManualReportMessage,
  OPEN_MANUAL_REPORT_MESSAGE,
  resolveManualReportPath,
  resolveReturnToChatAction,
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

  it("preserva conversa ao abrir manual e volta ao chat", () => {
    const opts = buildManualReportNavigateOptions({
      returnToChatConversationId: "conv-123",
    });
    expect(opts.state.returnToChatConversationId).toBe("conv-123");
    const back = resolveReturnToChatAction(opts.state);
    expect(back.path).toBe("/");
    expect(back.conversationId).toBe("conv-123");
  });
});
