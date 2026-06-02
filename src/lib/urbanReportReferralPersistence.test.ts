import { describe, expect, it } from "vitest";
import {
  councilReferralToReportReferral,
  resolveCommissionDisplayName,
  resolveUrbanReportResponsible,
} from "@/lib/urbanReportReferralPersistence";

describe("resolveUrbanReportResponsible", () => {
  const catalog = new Map([
    ["c1", "Comissão A"],
    ["c9", "Comissão de Mobilidade Urbana"],
  ]);

  it("prioriza encaminhamento a vereador (comissão + nome na mesma linha)", () => {
    const reportId = "r1";
    const commissionByReportId = new Map([[reportId, { id: "c1", name: "Comissão A" }]]);
    const councilByReportId = new Map([
      [
        reportId,
        {
          referralId: "ref1",
          commissionId: "c2",
          commissionName: "Comissão B",
          councillorId: "v1",
          councillorName: "Vereador X",
          referredAt: "2026-05-26T00:00:00Z",
          matchScore: 80,
          note: null,
        },
      ],
    ]);

    const out = resolveUrbanReportResponsible(
      reportId,
      commissionByReportId,
      councilByReportId,
      new Map(),
      catalog,
    );

    expect(out.responsibleId).toBe("c2");
    expect(out.responsibleName).toBe("Comissão B");
    expect(out.councilMemberName).toBe("Vereador X");
    expect(out.referral?.councillorName).toBe("Vereador X");
  });

  it("usa comissão do encaminhamento a vereador quando não há temático", () => {
    const reportId = "r2";
    const councilByReportId = new Map([
      [
        reportId,
        {
          referralId: "ref2",
          commissionId: "c9",
          commissionName: null,
          councillorId: "v2",
          councillorName: "Maria",
          referredAt: "2026-05-26T00:00:00Z",
          matchScore: 70,
          note: "teste",
        },
      ],
    ]);

    const out = resolveUrbanReportResponsible(
      reportId,
      new Map(),
      councilByReportId,
      new Map(),
      catalog,
    );

    expect(out.responsibleId).toBe("c9");
    expect(out.responsibleName).toBe("Comissão de Mobilidade Urbana");
    expect(out.councilMemberName).toBe("Maria");
    expect(out.referral?.commissionName).toBe("Comissão de Mobilidade Urbana");
  });
});

describe("resolveCommissionDisplayName", () => {
  it("não retorna rótulo genérico quando há id no catálogo", () => {
    const catalog = new Map([["c1", "Finanças e Orçamento"]]);
    expect(resolveCommissionDisplayName("c1", "Comissão", catalog)).toBe("Finanças e Orçamento");
  });
});

describe("councilReferralToReportReferral", () => {
  it("resolve nome da comissão pelo catálogo", () => {
    const catalog = new Map([["c1", "Meio Ambiente"]]);
    const ref = councilReferralToReportReferral(
      {
        referralId: "r",
        commissionId: "c1",
        commissionName: null,
        councillorId: "v",
        councillorName: "João",
        referredAt: "2026-05-26T00:00:00Z",
        matchScore: 1,
        note: null,
      },
      catalog,
    );
    expect(ref.commissionName).toBe("Meio Ambiente");
  });
});
