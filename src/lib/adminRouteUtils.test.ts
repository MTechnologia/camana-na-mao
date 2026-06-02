import { describe, expect, it } from "vitest";
import { usesGlobalReportsAnalytics, usesUnifiedAnalyticsBar } from "@/lib/adminRouteUtils";

describe("usesUnifiedAnalyticsBar", () => {
  it("exibe barra no dashboard executivo e nas rotas de gestão/encaminhamentos", () => {
    expect(usesUnifiedAnalyticsBar("/admin")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/admin/")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/admin/reports")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/admin/referrals")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/admin/referrals/fluxo")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/admin/commissions")).toBe(true);
  });

  it("exibe barra nas rotas analíticas e em /paineis", () => {
    expect(usesUnifiedAnalyticsBar("/admin/analytics")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/admin/trends")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/admin/reports-heatmap")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/admin/equipment-ratings")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/admin/public-hearings")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/paineis")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/paineis/avancado")).toBe(true);
    expect(usesUnifiedAnalyticsBar("/paineis/criar/abc")).toBe(true);
  });

  it("não exibe barra em outras rotas admin", () => {
    expect(usesUnifiedAnalyticsBar("/admin/classification-accuracy")).toBe(false);
    expect(usesUnifiedAnalyticsBar("/admin/notifications")).toBe(false);
    expect(usesUnifiedAnalyticsBar("/admin/users")).toBe(false);
  });
});

describe("usesGlobalReportsAnalytics", () => {
  it("ativa provider nas rotas de analytics unificado e nas seções com gráficos", () => {
    expect(usesGlobalReportsAnalytics("/admin")).toBe(true);
    expect(usesGlobalReportsAnalytics("/admin/reports")).toBe(true);
    expect(usesGlobalReportsAnalytics("/admin/exports")).toBe(true);
    expect(usesGlobalReportsAnalytics("/admin/notifications")).toBe(true);
    expect(usesGlobalReportsAnalytics("/admin/docs/overview")).toBe(true);
    expect(usesGlobalReportsAnalytics("/admin/settings/accessibility")).toBe(true);
  });

  it("ativa provider nas rotas analíticas e em /paineis", () => {
    expect(usesGlobalReportsAnalytics("/admin/analytics")).toBe(true);
    expect(usesGlobalReportsAnalytics("/admin/trends")).toBe(true);
    expect(usesGlobalReportsAnalytics("/admin/reports-heatmap")).toBe(true);
    expect(usesGlobalReportsAnalytics("/admin/equipment-ratings")).toBe(true);
    expect(usesGlobalReportsAnalytics("/admin/public-hearings")).toBe(true);
    expect(usesGlobalReportsAnalytics("/paineis")).toBe(true);
    expect(usesGlobalReportsAnalytics("/paineis/criar")).toBe(true);
  });

  it("não ativa provider em rotas admin sem gráficos de seção", () => {
    expect(usesGlobalReportsAnalytics("/admin/users")).toBe(false);
    expect(usesGlobalReportsAnalytics("/admin/classification-accuracy")).toBe(false);
  });
});
