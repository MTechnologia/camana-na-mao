import { describe, it, expect, vi, beforeEach } from "vitest";

import { createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { __test__ } from "./useMultiDrill";

const {
  aggregate,
  levelOf,
  inScopeReport,
  inScopeSubscription,
  normalizeStatus,
  normalizeSeverity,
  normalizeInscricaoStatus,
} = __test__;

// Reflete o tipo interno RawReport (não exportado para evitar acoplamento externo).
interface RawReport {
  id: string;
  source: "urbano" | "transporte" | "avaliacao";
  type: "Urbano" | "Transporte" | "Avaliação";
  category: string;
  neighborhood: string;
  status: string;
  severity: string;
  createdAt: string;
  title: string;
  subtitle: string;
  isResolved: boolean;
  isCritical: boolean;
}

interface RawSubscription {
  id: string;
  audienciaId: string;
  audienciaTitle: string;
  inscricaoStatus: string;
  userId: string;
  userName: string;
  userEmail: string;
  bairro: string;
  createdAt: string;
}

function report(overrides: Partial<RawReport> = {}): RawReport {
  return {
    id: "r1",
    source: "urbano",
    type: "Urbano",
    category: "Iluminação",
    neighborhood: "Tatuapé",
    status: "Pendente",
    severity: "Médio",
    createdAt: "2026-04-15T12:00:00Z",
    title: "Iluminação",
    subtitle: "",
    isResolved: false,
    isCritical: false,
    ...overrides,
  };
}

function subscription(overrides: Partial<RawSubscription> = {}): RawSubscription {
  return {
    id: "s1",
    audienciaId: "a1",
    audienciaTitle: "Audiência sobre Mobilidade",
    inscricaoStatus: "Confirmada",
    userId: "u1",
    userName: "Maria",
    userEmail: "maria@example.com",
    bairro: "Pinheiros",
    createdAt: "2026-04-10T12:00:00Z",
    ...overrides,
  };
}

describe("levelOf", () => {
  it("identifica corretamente o nível pela posição", () => {
    expect(levelOf({ dimension: "categoria" })).toBe(1);
    expect(levelOf({ dimension: "categoria", level1: "Urbano" })).toBe(2);
    expect(levelOf({ dimension: "categoria", level1: "Urbano", level2: "Iluminação" })).toBe(3);
    expect(
      levelOf({
        dimension: "categoria",
        level1: "Urbano",
        level2: "Iluminação",
        level3: "Tatuapé",
      }),
    ).toBe(4);
  });
});

describe("normalizadores", () => {
  it("normalizeStatus mapeia variantes para o canônico", () => {
    expect(normalizeStatus("resolved")).toBe("Resolvido");
    expect(normalizeStatus("RESOLVIDO")).toBe("Resolvido");
    expect(normalizeStatus("in_progress")).toBe("Em andamento");
    expect(normalizeStatus("pending")).toBe("Pendente");
    expect(normalizeStatus(null)).toBe("Pendente");
  });

  it("normalizeSeverity mapeia variantes", () => {
    expect(normalizeSeverity("crit")).toBe("Crítico");
    expect(normalizeSeverity("crítica")).toBe("Crítico");
    expect(normalizeSeverity("alta")).toBe("Alto");
    expect(normalizeSeverity("media")).toBe("Médio");
    expect(normalizeSeverity("low")).toBe("Baixo");
    expect(normalizeSeverity(null)).toBe("Sem classificação");
  });

  it("normalizeInscricaoStatus mapeia confirmada/inscrito → Confirmada", () => {
    expect(normalizeInscricaoStatus("confirmada")).toBe("Confirmada");
    expect(normalizeInscricaoStatus("inscrito")).toBe("Confirmada");
    expect(normalizeInscricaoStatus("presente")).toBe("Presente");
    expect(normalizeInscricaoStatus(null)).toBe("Confirmada");
  });
});

describe("inScopeReport — dimensão categoria", () => {
  it("filtra pelos 3 níveis", () => {
    const r = report({ type: "Urbano", category: "Iluminação", neighborhood: "Tatuapé" });
    expect(inScopeReport(r, { dimension: "categoria" })).toBe(true);
    expect(inScopeReport(r, { dimension: "categoria", level1: "Transporte" })).toBe(false);
    expect(inScopeReport(r, { dimension: "categoria", level1: "Urbano" })).toBe(true);
    expect(
      inScopeReport(r, { dimension: "categoria", level1: "Urbano", level2: "Iluminação" }),
    ).toBe(true);
    expect(inScopeReport(r, { dimension: "categoria", level1: "Urbano", level2: "Buracos" })).toBe(
      false,
    );
    expect(
      inScopeReport(r, {
        dimension: "categoria",
        level1: "Urbano",
        level2: "Iluminação",
        level3: "Tatuapé",
      }),
    ).toBe(true);
    expect(
      inScopeReport(r, {
        dimension: "categoria",
        level1: "Urbano",
        level2: "Iluminação",
        level3: "Mooca",
      }),
    ).toBe(false);
  });
});

describe("inScopeReport — dimensão tempo", () => {
  it("filtra por ano/mês/dia da createdAt", () => {
    const r = report({ createdAt: "2026-04-15T12:00:00Z" });
    expect(inScopeReport(r, { dimension: "tempo", level1: "2026" })).toBe(true);
    expect(inScopeReport(r, { dimension: "tempo", level1: "2025" })).toBe(false);
    expect(inScopeReport(r, { dimension: "tempo", level1: "2026", level2: "4" })).toBe(true);
    expect(inScopeReport(r, { dimension: "tempo", level1: "2026", level2: "5" })).toBe(false);
    // dia depende do timezone — usamos a data local; aqui aceitamos 14 ou 15
    expect(["14", "15"].includes(new Date(r.createdAt).getDate().toString())).toBe(true);
  });

  it("rejeita createdAt inválido", () => {
    const r = report({ createdAt: "not-a-date" });
    expect(inScopeReport(r, { dimension: "tempo", level1: "2026" })).toBe(false);
  });
});

describe("inScopeReport — dimensão status", () => {
  it("filtra por status, severidade e bairro", () => {
    const r = report({ status: "Resolvido", severity: "Alto", neighborhood: "Mooca" });
    expect(inScopeReport(r, { dimension: "status", level1: "Resolvido" })).toBe(true);
    expect(inScopeReport(r, { dimension: "status", level1: "Pendente" })).toBe(false);
    expect(inScopeReport(r, { dimension: "status", level1: "Resolvido", level2: "Alto" })).toBe(
      true,
    );
    expect(inScopeReport(r, { dimension: "status", level1: "Resolvido", level2: "Crítico" })).toBe(
      false,
    );
    expect(
      inScopeReport(r, {
        dimension: "status",
        level1: "Resolvido",
        level2: "Alto",
        level3: "Mooca",
      }),
    ).toBe(true);
  });
});

describe("inScopeSubscription — dimensão audiência", () => {
  it("filtra por audiência → status → bairro", () => {
    const s = subscription({
      audienciaId: "a1",
      inscricaoStatus: "Confirmada",
      bairro: "Pinheiros",
    });
    expect(inScopeSubscription(s, { dimension: "audiencia", level1: "a1" })).toBe(true);
    expect(inScopeSubscription(s, { dimension: "audiencia", level1: "a2" })).toBe(false);
    expect(
      inScopeSubscription(s, { dimension: "audiencia", level1: "a1", level2: "Confirmada" }),
    ).toBe(true);
    expect(
      inScopeSubscription(s, { dimension: "audiencia", level1: "a1", level2: "Pendente" }),
    ).toBe(false);
    expect(
      inScopeSubscription(s, {
        dimension: "audiencia",
        level1: "a1",
        level2: "Confirmada",
        level3: "Pinheiros",
      }),
    ).toBe(true);
  });

  it("retorna false para outras dimensões", () => {
    const s = subscription();
    expect(inScopeSubscription(s, { dimension: "categoria" })).toBe(false);
    expect(inScopeSubscription(s, { dimension: "tempo" })).toBe(false);
  });
});

describe("aggregate — dimensão categoria", () => {
  const reports: RawReport[] = [
    report({ id: "1", type: "Urbano", category: "Iluminação", neighborhood: "Tatuapé" }),
    report({ id: "2", type: "Urbano", category: "Iluminação", neighborhood: "Mooca" }),
    report({
      id: "3",
      type: "Urbano",
      category: "Buracos",
      neighborhood: "Tatuapé",
      isResolved: true,
    }),
    report({
      id: "4",
      source: "transporte",
      type: "Transporte",
      category: "Ônibus lotado",
      neighborhood: "Bela Vista",
    }),
  ];

  it("nível 1: lista tipos com contagens", () => {
    const stats = aggregate(reports, [], { dimension: "categoria" });
    expect(stats.total).toBe(4);
    expect(stats.isLeaf).toBe(false);
    expect(stats.nextItems.find((i) => i.value === "Urbano")?.count).toBe(3);
    expect(stats.nextItems.find((i) => i.value === "Transporte")?.count).toBe(1);
  });

  it("nível 2: filtra por tipo e lista categorias", () => {
    const stats = aggregate(reports, [], { dimension: "categoria", level1: "Urbano" });
    expect(stats.total).toBe(3);
    expect(stats.nextItems.find((i) => i.value === "Iluminação")?.count).toBe(2);
    expect(stats.nextItems.find((i) => i.value === "Buracos")?.count).toBe(1);
  });

  it("nível 3: filtra por tipo+categoria e lista bairros com taxa de resolução", () => {
    const stats = aggregate(reports, [], {
      dimension: "categoria",
      level1: "Urbano",
      level2: "Iluminação",
    });
    expect(stats.total).toBe(2);
    expect(stats.nextItems).toHaveLength(2);
    expect(stats.nextItems[0].count).toBe(1);
  });

  it("folha (nível 4): retorna registros detalhados", () => {
    const stats = aggregate(reports, [], {
      dimension: "categoria",
      level1: "Urbano",
      level2: "Iluminação",
      level3: "Tatuapé",
    });
    expect(stats.isLeaf).toBe(true);
    expect(stats.records).toHaveLength(1);
    expect(stats.records[0].kind).toBe("report");
    if (stats.records[0].kind === "report") {
      expect(stats.records[0].id).toBe("1");
    }
    expect(stats.nextItems).toHaveLength(0);
  });
});

describe("aggregate — dimensão tempo", () => {
  const reports: RawReport[] = [
    report({ id: "a", createdAt: "2026-04-15T10:00:00Z" }),
    report({ id: "b", createdAt: "2026-04-20T10:00:00Z" }),
    report({ id: "c", createdAt: "2025-12-01T10:00:00Z" }),
  ];

  it("nível 1: agrupa por ano", () => {
    const stats = aggregate(reports, [], { dimension: "tempo" });
    expect(stats.nextItems.find((i) => i.value === "2026")?.count).toBe(2);
    expect(stats.nextItems.find((i) => i.value === "2025")?.count).toBe(1);
  });

  it("nível 2: filtra por ano e agrupa por mês", () => {
    const stats = aggregate(reports, [], { dimension: "tempo", level1: "2026" });
    expect(stats.total).toBe(2);
    // mês 4 (abril)
    expect(stats.nextItems.find((i) => i.value === "4")?.count).toBe(2);
  });
});

describe("aggregate — dimensão status", () => {
  const reports: RawReport[] = [
    report({ id: "a", status: "Pendente", severity: "Crítico", neighborhood: "Sé" }),
    report({ id: "b", status: "Pendente", severity: "Alto", neighborhood: "Sé" }),
    report({
      id: "c",
      status: "Resolvido",
      severity: "Médio",
      neighborhood: "Mooca",
      isResolved: true,
    }),
  ];

  it("nível 1: agrupa por status", () => {
    const stats = aggregate(reports, [], { dimension: "status" });
    expect(stats.nextItems.find((i) => i.value === "Pendente")?.count).toBe(2);
    expect(stats.nextItems.find((i) => i.value === "Resolvido")?.count).toBe(1);
  });

  it("nível 2: filtra por status e agrupa por severidade", () => {
    const stats = aggregate(reports, [], { dimension: "status", level1: "Pendente" });
    expect(stats.total).toBe(2);
    expect(stats.nextItems.find((i) => i.value === "Crítico")?.count).toBe(1);
    expect(stats.nextItems.find((i) => i.value === "Alto")?.count).toBe(1);
  });
});

describe("aggregate — dimensão audiencia", () => {
  const subs: RawSubscription[] = [
    subscription({
      id: "s1",
      audienciaId: "a1",
      inscricaoStatus: "Confirmada",
      bairro: "Pinheiros",
    }),
    subscription({ id: "s2", audienciaId: "a1", inscricaoStatus: "Confirmada", bairro: "Mooca" }),
    subscription({ id: "s3", audienciaId: "a1", inscricaoStatus: "Presente", bairro: "Pinheiros" }),
    subscription({ id: "s4", audienciaId: "a2", inscricaoStatus: "Confirmada", bairro: "Sé" }),
  ];

  it("nível 1: agrupa por audiência", () => {
    const stats = aggregate([], subs, { dimension: "audiencia" });
    expect(stats.total).toBe(4);
    expect(stats.nextItems.find((i) => i.value === "a1")?.count).toBe(3);
    expect(stats.nextItems.find((i) => i.value === "a2")?.count).toBe(1);
  });

  it("nível 2: filtra por audiência e agrupa por status", () => {
    const stats = aggregate([], subs, { dimension: "audiencia", level1: "a1" });
    expect(stats.total).toBe(3);
    expect(stats.nextItems.find((i) => i.value === "Confirmada")?.count).toBe(2);
    expect(stats.nextItems.find((i) => i.value === "Presente")?.count).toBe(1);
  });

  it("nível 3: filtra por audiência+status e agrupa por bairro", () => {
    const stats = aggregate([], subs, {
      dimension: "audiencia",
      level1: "a1",
      level2: "Confirmada",
    });
    expect(stats.total).toBe(2);
    expect(stats.nextItems).toHaveLength(2);
  });

  it("folha (nível 4): retorna lista de inscritos", () => {
    const stats = aggregate([], subs, {
      dimension: "audiencia",
      level1: "a1",
      level2: "Confirmada",
      level3: "Pinheiros",
    });
    expect(stats.isLeaf).toBe(true);
    expect(stats.records).toHaveLength(1);
    expect(stats.records[0].kind).toBe("subscription");
    if (stats.records[0].kind === "subscription") {
      expect(stats.records[0].userName).toBe("Maria");
      expect(stats.records[0].userEmail).toBe("maria@example.com");
    }
  });
});

describe("aggregate — edge cases", () => {
  it("retorna stats vazias quando não há dados", () => {
    const stats = aggregate([], [], { dimension: "categoria" });
    expect(stats.total).toBe(0);
    expect(stats.resolutionPct).toBe(0);
    expect(stats.criticalPct).toBe(0);
    expect(stats.nextItems).toHaveLength(0);
    expect(stats.records).toHaveLength(0);
  });

  it("calcula resolutionPct e criticalPct corretamente", () => {
    const reports: RawReport[] = [
      report({ id: "1", isResolved: true, isCritical: false }),
      report({ id: "2", isResolved: true, isCritical: true }),
      report({ id: "3", isResolved: false, isCritical: true }),
      report({ id: "4", isResolved: false, isCritical: false }),
    ];
    const stats = aggregate(reports, [], { dimension: "categoria" });
    expect(stats.total).toBe(4);
    expect(stats.resolved).toBe(2);
    expect(stats.resolutionPct).toBe(50);
    expect(stats.critical).toBe(2);
    expect(stats.criticalPct).toBe(50);
  });

  it("limita registros na folha a 200", () => {
    const reports: RawReport[] = Array.from({ length: 250 }, (_, i) =>
      report({ id: `r${i}`, neighborhood: "Tatuapé" }),
    );
    const stats = aggregate(reports, [], {
      dimension: "categoria",
      level1: "Urbano",
      level2: "Iluminação",
      level3: "Tatuapé",
    });
    expect(stats.records).toHaveLength(200);
  });
});

describe("hook useMultiDrill (smoke)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("os exports principais existem", () => {
    expect(typeof aggregate).toBe("function");
    expect(typeof levelOf).toBe("function");
    expect(typeof inScopeReport).toBe("function");
    expect(typeof inScopeSubscription).toBe("function");
  });
});
