import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { __test__, useAudienciasAnalytics } from "./useAudienciasAnalytics";
import { supabase } from "@/integrations/supabase/client";

const { aggregate, ocupacao, isAudienciaAberta, isProximaDentroDe, rank } = __test__;

interface AudienciaRow {
  id: string;
  titulo: string;
  comissao: string | null;
  tema: string;
  data: string;
  local: string;
  ap_code: string | null;
  status: string;
  inscricoes_abertas: boolean | null;
  vagas_disponiveis: number | null;
}

interface InscricaoRow {
  audiencia_id: string;
  user_id: string;
}

interface ParticipacaoRow {
  audiencia_id: string;
  user_id: string;
  tipo: string;
}

function aud(overrides: Partial<AudienciaRow> = {}): AudienciaRow {
  return {
    id: "a1",
    titulo: "Audiência sobre transporte",
    comissao: "Mobilidade",
    tema: "Transporte público",
    data: "2026-05-10",
    local: "Pinheiros",
    ap_code: null,
    status: "agendada",
    inscricoes_abertas: true,
    vagas_disponiveis: 100,
    ...overrides,
  };
}

function insc(audiencia_id: string, user_id: string): InscricaoRow {
  return { audiencia_id, user_id };
}

function part(
  audiencia_id: string,
  user_id: string,
  tipo: "videoconferencia" | "escrito" = "videoconferencia",
): ParticipacaoRow {
  return { audiencia_id, user_id, tipo };
}

describe("ocupacao", () => {
  it("retorna null quando não há vagas definidas", () => {
    expect(ocupacao(10, null)).toBeNull();
    expect(ocupacao(10, 0)).toBeNull();
  });

  it("calcula percentual correto", () => {
    expect(ocupacao(50, 100)).toBe(0.5);
  });

  it("limita em 1 quando inscritos > vagas", () => {
    expect(ocupacao(150, 100)).toBe(1);
  });
});

describe("rank", () => {
  it("ordena por count desc e limita ao top N", () => {
    const map = new Map<string, number>([
      ["A", 5],
      ["B", 10],
      ["C", 1],
    ]);
    expect(rank(map, 2)).toEqual([
      { label: "B", count: 10 },
      { label: "A", count: 5 },
    ]);
  });

  it("retorna lista vazia para mapa vazio", () => {
    expect(rank(new Map())).toEqual([]);
  });
});

describe("isAudienciaAberta", () => {
  const today = "2026-05-19";

  it("é aberta quando agendada, inscrições abertas e data futura", () => {
    expect(
      isAudienciaAberta(
        { data: "2026-05-25", status: "agendada", inscricoes_abertas: true },
        today,
      ),
    ).toBe(true);
  });

  it("não é aberta quando a data já passou", () => {
    expect(
      isAudienciaAberta(
        { data: "2026-05-10", status: "agendada", inscricoes_abertas: true },
        today,
      ),
    ).toBe(false);
  });

  it("não é aberta quando inscrições estão fechadas", () => {
    expect(
      isAudienciaAberta(
        { data: "2026-05-25", status: "agendada", inscricoes_abertas: false },
        today,
      ),
    ).toBe(false);
  });

  it("é aberta quando inscricoes_abertas é null (default do banco)", () => {
    expect(
      isAudienciaAberta(
        { data: "2026-05-25", status: "agendada", inscricoes_abertas: null },
        today,
      ),
    ).toBe(true);
  });

  it("não é aberta quando status é realizada", () => {
    expect(
      isAudienciaAberta(
        { data: "2026-05-25", status: "realizada", inscricoes_abertas: true },
        today,
      ),
    ).toBe(false);
  });
});

describe("isProximaDentroDe", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna true para audiência hoje + 3 dias", () => {
    expect(isProximaDentroDe("2026-05-09", 7)).toBe(true);
  });

  it("retorna false para audiência além de 7 dias", () => {
    expect(isProximaDentroDe("2026-05-20", 7)).toBe(false);
  });

  it("retorna false para audiência no passado", () => {
    expect(isProximaDentroDe("2026-05-01", 7)).toBe(false);
  });

  it("retorna false para data inválida", () => {
    expect(isProximaDentroDe("invalido", 7)).toBe(false);
  });
});

describe("aggregate", () => {
  it("conta audienciasAbertas no recorte filtrado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-19T12:00:00"));
    const r = aggregate(
      [
        aud({ id: "open", data: "2026-05-25", inscricoes_abertas: true, status: "agendada" }),
        aud({ id: "past", data: "2026-05-10", inscricoes_abertas: true, status: "agendada" }),
        aud({ id: "closed", data: "2026-05-25", inscricoes_abertas: false, status: "agendada" }),
      ],
      [],
      [],
    );
    expect(r.audienciasAbertas).toBe(1);
    vi.useRealTimers();
  });

  it("retorna stats vazias com inputs vazios", () => {
    const r = aggregate([], [], []);
    expect(r.totalAudiencias).toBe(0);
    expect(r.totalInscricoes).toBe(0);
    expect(r.byComissao).toEqual([]);
  });

  it("soma lembretes (inscricoes) e quebra por tipo", () => {
    const audiencias = [aud({ id: "a1" })];
    const inscricoes = [insc("a1", "u1"), insc("a1", "u2")];
    const r = aggregate(audiencias, inscricoes, []);
    expect(r.totalInscricoes).toBe(2);
    expect(r.totalLembretes).toBe(2);
    expect(r.totalVideoconferencias).toBe(0);
    expect(r.totalEscritas).toBe(0);
  });

  it("soma participações de videoconferência e manifestações escritas", () => {
    const audiencias = [aud({ id: "a1" })];
    const participacoes = [
      part("a1", "u1", "videoconferencia"),
      part("a1", "u2", "videoconferencia"),
      part("a1", "u3", "escrito"),
    ];
    const r = aggregate(audiencias, [], participacoes);
    expect(r.totalInscricoes).toBe(3);
    expect(r.totalVideoconferencias).toBe(2);
    expect(r.totalEscritas).toBe(1);
  });

  it("combina lembretes + participações no totalInscricoes", () => {
    const audiencias = [aud({ id: "a1" })];
    const inscricoes = [insc("a1", "u1")];
    const participacoes = [part("a1", "u2", "videoconferencia"), part("a1", "u3", "escrito")];
    const r = aggregate(audiencias, inscricoes, participacoes);
    expect(r.totalInscricoes).toBe(3);
    expect(r.audienciasComInscricoes).toBe(1);
  });

  it("calcula usuários únicos somando inscrições e participações sem duplicar", () => {
    const audiencias = [aud({ id: "a1" }), aud({ id: "a2" })];
    const inscricoes = [insc("a1", "u1"), insc("a2", "u2")];
    const participacoes = [
      part("a1", "u1", "videoconferencia"), // mesmo user u1
      part("a2", "u3", "escrito"),
    ];
    const r = aggregate(audiencias, inscricoes, participacoes);
    expect(r.usuariosUnicos).toBe(3); // u1, u2, u3
  });

  it("calcula ocupação média ignorando audiências sem vagas", () => {
    const audiencias = [
      aud({ id: "a1", vagas_disponiveis: 100 }),
      aud({ id: "a2", vagas_disponiveis: null }),
      aud({ id: "a3", vagas_disponiveis: 50 }),
    ];
    const inscricoes = [insc("a1", "u1")]; // 1/100 = 1%
    const participacoes = [
      part("a3", "u1", "videoconferencia"),
      part("a3", "u2", "videoconferencia"),
      part("a3", "u3", "escrito"), // 3/50 = 6%
    ];
    const r = aggregate(audiencias, inscricoes, participacoes);
    expect(r.ocupacaoMediaPct).toBe(4); // (0.01 + 0.06) / 2 ≈ 0.035 → 4%
  });

  it("ranqueia por comissão somando todos os tipos de engajamento", () => {
    const audiencias = [
      aud({ id: "a1", comissao: "Saúde" }),
      aud({ id: "a2", comissao: "Educação" }),
    ];
    const inscricoes = [insc("a1", "u1")];
    const participacoes = [part("a1", "u2", "videoconferencia"), part("a2", "u3", "escrito")];
    const r = aggregate(audiencias, inscricoes, participacoes);
    expect(r.byComissao[0]).toEqual({ label: "Saúde", count: 2 });
    expect(r.byComissao[1]).toEqual({ label: "Educação", count: 1 });
  });

  it("topAudiencias usa total combinado para ordenação", () => {
    const audiencias = [
      aud({ id: "a1", titulo: "menos popular" }),
      aud({ id: "a2", titulo: "mais popular" }),
    ];
    const inscricoes = [insc("a1", "u1")]; // a1 = 1
    const participacoes = [
      part("a2", "u1", "videoconferencia"),
      part("a2", "u2", "videoconferencia"),
      part("a2", "u3", "escrito"), // a2 = 3
    ];
    const r = aggregate(audiencias, inscricoes, participacoes);
    expect(r.topAudiencias[0].titulo).toBe("mais popular");
    expect(r.topAudiencias[0].inscricoes).toBe(3);
  });

  it("zeroInscritosProximas captura audiências futuras sem QUALQUER engajamento", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T10:00:00Z"));
    try {
      const audiencias = [
        aud({ id: "a1", data: "2026-05-08" }),
        aud({ id: "a2", data: "2026-05-09" }),
        aud({ id: "a3", data: "2026-05-10" }),
      ];
      // a1: nenhum sinal → entra
      // a2: tem participação → não entra
      // a3: tem inscrição → não entra
      const inscricoes = [insc("a3", "u1")];
      const participacoes = [part("a2", "u1", "videoconferencia")];
      const r = aggregate(audiencias, inscricoes, participacoes);
      expect(r.zeroInscritosProximas.map((a) => a.id)).toEqual(["a1"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("byTipoEngajamento omite categorias com 0 e ordena por count", () => {
    const audiencias = [aud({ id: "a1" })];
    const inscricoes = [insc("a1", "u1")];
    const participacoes = [
      part("a1", "u2", "videoconferencia"),
      part("a1", "u3", "videoconferencia"),
      part("a1", "u4", "videoconferencia"),
    ];
    const r = aggregate(audiencias, inscricoes, participacoes);
    expect(r.byTipoEngajamento).toEqual([
      { label: "Videoconferência", count: 3 },
      { label: "Lembrete", count: 1 },
    ]);
  });

  it("monta timeline ordenada por data", () => {
    const audiencias = [
      aud({ id: "a1", data: "2026-05-10" }),
      aud({ id: "a2", data: "2026-05-05" }),
    ];
    const inscricoes = [insc("a1", "u1"), insc("a2", "u2")];
    const r = aggregate(audiencias, inscricoes, []);
    expect(r.timeline[0].date).toBe("2026-05-05");
    expect(r.timeline[1].date).toBe("2026-05-10");
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

describe("useAudienciasAnalytics (hook)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("integra audiencias + inscricoes (lembretes) + participacoes (video/escrito)", async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === "audiencias") {
        return chain({
          data: [
            {
              id: "a1",
              titulo: "Audiência teste",
              comissao: "Saúde",
              tema: "Atendimento",
              data: "2026-05-10",
              local: "Pinheiros",
              ap_code: null,
              status: "agendada",
              vagas_disponiveis: 100,
            },
          ],
          error: null,
        });
      }
      if (table === "audiencia_inscricoes") {
        return chain({
          data: [{ audiencia_id: "a1", user_id: "u1" }],
          error: null,
        });
      }
      if (table === "audiencia_participacoes") {
        return chain({
          data: [
            { audiencia_id: "a1", user_id: "u2", tipo: "videoconferencia" },
            { audiencia_id: "a1", user_id: "u3", tipo: "escrito" },
          ],
          error: null,
        });
      }
      return chain({ data: [], error: null });
    });
    vi.spyOn(supabase, "from").mockImplementation(fromMock as unknown as SupabaseFrom);

    const { result } = renderHook(() => useAudienciasAnalytics({}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Engajamento total = 1 lembrete (inscrição) + 1 videoconferência + 1 escrito = 3.
    expect(result.current.error).toBeNull();
    expect(result.current.stats.totalInscricoes).toBe(3);
    expect(result.current.stats.totalLembretes).toBe(1);
    expect(result.current.stats.totalVideoconferencias).toBe(1);
  });

  it("propaga erro de Supabase em audiencias", async () => {
    const errorImpl = (_table: string) => chain({ data: null, error: { message: "boom" } });
    vi.spyOn(supabase, "from").mockImplementation(errorImpl as unknown as SupabaseFrom);

    const { result } = renderHook(() => useAudienciasAnalytics({}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatch(/Não foi possível carregar/i);
    expect(result.current.stats.totalAudiencias).toBe(0);
  });
});
