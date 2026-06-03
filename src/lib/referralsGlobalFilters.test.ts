import { describe, expect, it } from "vitest";
import { computeCouncilReferralKpis } from "@/lib/referralsGlobalFilters";

describe("referralsGlobalFilters", () => {
  it("computeCouncilReferralKpis agrega por status", () => {
    const kpis = computeCouncilReferralKpis([
      { status: "pending", created_at: "2026-01-01", resolved_at: null },
      { status: "pending", created_at: "2026-01-02", resolved_at: null },
      { status: "resolved", created_at: "2026-01-03", resolved_at: "2026-01-10" },
    ]);
    expect(kpis.total).toBe(3);
    expect(kpis.pending).toBe(2);
    expect(kpis.resolved).toBe(1);
  });
});
