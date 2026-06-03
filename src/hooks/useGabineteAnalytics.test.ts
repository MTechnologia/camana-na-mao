import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { __test__, useGabineteAnalytics } from "./useGabineteAnalytics";
import { supabase } from "@/integrations/supabase/client";

const { aggregate, buildBreakdown, diffHours, startOfWeek } = __test__;

interface ReferralRow {
  id: string;
  status: string;
  created_at: string | null;
  sent_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  urban_report_id: string | null;
  transport_report_id: string | null;
  service_rating_id: string | null;
}

function ref(overrides: Partial<ReferralRow> = {}): ReferralRow {
  return {
    id: "r1",
    status: "pending",
    created_at: "2026-04-01T10:00:00Z",
    sent_at: null,
    acknowledged_at: null,
    resolved_at: null,
    urban_report_id: null,
    transport_report_id: null,
    service_rating_id: null,
    ...overrides,
  };
}

const emptyRelatos = {
  urban: new Map(),
  transport: new Map(),
  service: new Map(),
};

describe("helpers", () => {
  it("diffHours retorna null para entradas inválidas", () => {
    expect(diffHours(null, "2026-04-01T10:00:00Z")).toBeNull();
    expect(diffHours("2026-04-01T10:00:00Z", null)).toBeNull();
    expect(diffHours("2026-04-02T10:00:00Z", "2026-04-01T10:00:00Z")).toBeNull();
  });

  it("diffHours calcula diferença em horas", () => {
    expect(diffHours("2026-04-01T10:00:00Z", "2026-04-01T22:00:00Z")).toBe(12);
    expect(diffHours("2026-04-01T10:00:00Z", "2026-04-02T10:00:00Z")).toBe(24);
  });

  it("startOfWeek retorna a segunda da semana ISO", () => {
    expect(startOfWeek("2026-05-06T10:00:00Z")).toBe("2026-05-04");
    expect(startOfWeek("2026-05-04T00:00:00Z")).toBe("2026-05-04");
    expect(startOfWeek("2026-05-03T10:00:00Z")).toBe("2026-04-27");
  });

  it("buildBreakdown agrega por chave e calcula resolutionPct", () => {
    const rows = [
      { key: "A", resolved: true },
      { key: "A", resolved: true },
      { key: "A", resolved: false },
      { key: "B", resolved: false },
    ];
    const result = buildBreakdown(rows);
    expect(result[0]).toEqual({ label: "A", total: 3, resolvidos: 2, resolutionPct: 67 });
    expect(result[1]).toEqual({ label: "B", total: 1, resolvidos: 0, resolutionPct: 0 });
  });
});

describe("aggregate", () => {
  it("retorna stats vazias para input vazio", () => {
    const r = aggregate([], emptyRelatos);
    expect(r.total).toBe(0);
    expect(r.resolutionPct).toBe(0);
    expect(r.timeline).toEqual([]);
  });

  it("conta status corretamente", () => {
    const referrals: ReferralRow[] = [
      ref({ id: "1", status: "pending" }),
      ref({ id: "2", status: "sent" }),
      ref({ id: "3", status: "acknowledged" }),
      ref({ id: "4", status: "resolved", resolved_at: "2026-04-05T10:00:00Z" }),
      ref({ id: "5", status: "resolved", resolved_at: "2026-04-06T10:00:00Z" }),
    ];
    const r = aggregate(referrals, emptyRelatos);
    expect(r.total).toBe(5);
    expect(r.pending).toBe(1);
    expect(r.sent).toBe(1);
    expect(r.acknowledged).toBe(1);
    expect(r.resolved).toBe(2);
    expect(r.resolutionPct).toBe(40);
  });

  it("calcula tempo médio até acknowledgement ignorando referrals sem ack", () => {
    const referrals: ReferralRow[] = [
      ref({
        id: "1",
        sent_at: "2026-04-01T10:00:00Z",
        acknowledged_at: "2026-04-02T10:00:00Z",
      }),
      ref({
        id: "2",
        sent_at: "2026-04-03T10:00:00Z",
        acknowledged_at: "2026-04-03T22:00:00Z",
      }),
      ref({ id: "3", sent_at: "2026-04-04T10:00:00Z" }),
    ];
    const r = aggregate(referrals, emptyRelatos);
    expect(r.avgAckHours).toBe(18);
  });

  it("calcula tempo médio até resolução usando created_at quando sent_at é null", () => {
    const referrals: ReferralRow[] = [
      ref({
        id: "1",
        created_at: "2026-04-01T10:00:00Z",
        sent_at: null,
        resolved_at: "2026-04-02T10:00:00Z",
      }),
    ];
    const r = aggregate(referrals, emptyRelatos);
    expect(r.avgResolutionHours).toBe(24);
  });

  it("monta timeline semanal agregando por segunda-feira", () => {
    const referrals: ReferralRow[] = [
      ref({ id: "1", created_at: "2026-05-04T10:00:00Z" }),
      ref({ id: "2", created_at: "2026-05-05T10:00:00Z" }),
      ref({
        id: "3",
        created_at: "2026-05-04T10:00:00Z",
        resolved_at: "2026-05-04T20:00:00Z",
      }),
      ref({ id: "4", created_at: "2026-05-11T10:00:00Z" }),
    ];
    const r = aggregate(referrals, emptyRelatos);
    expect(r.timeline).toHaveLength(2);
    expect(r.timeline[0]).toEqual({ weekStart: "2026-05-04", recebidos: 3, resolvidos: 1 });
    expect(r.timeline[1]).toEqual({ weekStart: "2026-05-11", recebidos: 1, resolvidos: 0 });
  });

  it("breakdown por categoria usa relato vinculado", () => {
    const referrals: ReferralRow[] = [
      ref({ id: "r1", urban_report_id: "u1" }),
      ref({
        id: "r2",
        urban_report_id: "u2",
        resolved_at: "2026-04-05T10:00:00Z",
        status: "resolved",
      }),
      ref({ id: "r3", transport_report_id: "t1" }),
    ];
    const relatos = {
      urban: new Map([
        ["u1", { id: "u1", category: "Iluminação", region: "Tatuapé" }],
        ["u2", { id: "u2", category: "Iluminação", region: "Sé" }],
      ]),
      transport: new Map([["t1", { id: "t1", category: "Atraso", region: "Pinheiros" }]]),
      service: new Map(),
    };
    const r = aggregate(referrals, relatos);
    const ilum = r.byCategory.find((c) => c.label === "Iluminação");
    expect(ilum).toBeDefined();
    expect(ilum?.total).toBe(2);
    expect(ilum?.resolvidos).toBe(1);
    expect(ilum?.resolutionPct).toBe(50);
  });

  it("breakdown por zona usa region->zone", () => {
    const referrals: ReferralRow[] = [
      ref({ id: "r1", urban_report_id: "u1" }),
      ref({ id: "r2", urban_report_id: "u2" }),
    ];
    const relatos = {
      urban: new Map([
        ["u1", { id: "u1", category: "A", region: "Tatuapé" }],
        ["u2", { id: "u2", category: "A", region: "Pinheiros" }],
      ]),
      transport: new Map(),
      service: new Map(),
    };
    const r = aggregate(referrals, relatos);
    const labels = r.byZone.map((z) => z.label);
    expect(labels).toContain("Zona Leste");
    expect(labels).toContain("Zona Oeste");
  });

  it("usa 'Sem categoria' / 'Não informada' quando relato não tem dados", () => {
    const referrals: ReferralRow[] = [ref({ id: "r1", urban_report_id: "u1" })];
    const relatos = {
      urban: new Map([["u1", { id: "u1", category: null, region: null }]]),
      transport: new Map(),
      service: new Map(),
    };
    const r = aggregate(referrals, relatos);
    expect(r.byCategory[0].label).toBe("Sem categoria");
    expect(r.byZone[0].label).toBe("Não informada");
  });
});

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
}

function chain(result: { data: unknown; error: unknown }): MockChain {
  const c = {} as MockChain;
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.in = vi.fn().mockReturnValue(Promise.resolve(result));
  c.order = vi.fn().mockReturnValue(c);
  c.range = vi.fn().mockResolvedValue(result);
  c.gte = vi.fn().mockReturnValue(c);
  c.lte = vi.fn().mockReturnValue(c);
  return c;
}

type SupabaseFrom = typeof supabase.from;

describe("useGabineteAnalytics (hook)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna stats vazias quando councilMemberId é null", async () => {
    const { result } = renderHook(() => useGabineteAnalytics(null));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.total).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("integra referrals e calcula stats quando councilMemberId fornecido", async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === "council_member_referrals") {
        return chain({
          data: [
            {
              id: "ref1",
              status: "resolved",
              created_at: "2026-04-01T10:00:00Z",
              sent_at: "2026-04-01T11:00:00Z",
              acknowledged_at: "2026-04-01T15:00:00Z",
              resolved_at: "2026-04-02T11:00:00Z",
              urban_report_id: "u1",
              transport_report_id: null,
              service_rating_id: null,
            },
          ],
          error: null,
        });
      }
      if (table === "urban_reports") {
        return chain({
          data: [{ id: "u1", category: "Iluminação", neighborhood: "Tatuapé" }],
          error: null,
        });
      }
      return chain({ data: [], error: null });
    });

    vi.spyOn(supabase, "from").mockImplementation(fromMock as unknown as SupabaseFrom);

    const { result } = renderHook(() => useGabineteAnalytics("council-1"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.stats.total).toBe(1);
    expect(result.current.stats.resolved).toBe(1);
    expect(result.current.stats.resolutionPct).toBe(100);
    expect(result.current.stats.byCategory[0]?.label).toBe("Iluminação");
  });

  it("propaga erro de Supabase no estado de erro", async () => {
    const errorImpl = (table: string) =>
      table === "council_member_referrals"
        ? chain({ data: null, error: { message: "boom" } })
        : chain({ data: [], error: null });
    vi.spyOn(supabase, "from").mockImplementation(errorImpl as unknown as SupabaseFrom);

    const { result } = renderHook(() => useGabineteAnalytics("council-1"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatch(/Não foi possível carregar/i);
    expect(result.current.stats.total).toBe(0);
  });
});
