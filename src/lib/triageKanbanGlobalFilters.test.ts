import { describe, expect, it, vi } from "vitest";
import {
  applyKanbanDateRange,
  applyKanbanTransportCategory,
  applyKanbanUrbanCategory,
  kanbanHasGlobalRecorte,
  kanbanTransportRowMatchesRegion,
  kanbanUrbanRowMatchesRegion,
  kanbanWantsTransportSource,
  kanbanWantsUrbanSource,
} from "@/lib/triageKanbanGlobalFilters";

/** Query encadeável falsa (gte/lte/in retornam a si mesma) com spies. */
function fakeQuery() {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  q.gte = vi.fn(() => q);
  q.lte = vi.fn(() => q);
  q.in = vi.fn(() => q);
  return q as typeof q & {
    gte: (c: string, v: string) => unknown;
    lte: (c: string, v: string) => unknown;
    in: (c: string, v: string[]) => unknown;
  };
}

describe("triageKanbanGlobalFilters — fontes por categoria", () => {
  it("mobilidade inclui urbano e transporte", () => {
    expect(kanbanWantsUrbanSource(undefined, "mobilidade")).toBe(true);
    expect(kanbanWantsTransportSource(undefined, "mobilidade")).toBe(true);
  });

  it("urbanismo não busca transporte; fonte local restringe", () => {
    expect(kanbanWantsUrbanSource(undefined, "urbanismo")).toBe(true);
    expect(kanbanWantsTransportSource(undefined, "urbanismo")).toBe(false);
    expect(kanbanWantsUrbanSource(["transport"], "all")).toBe(false);
  });

  it("sem localSources e categoria 'all' → quer ambos", () => {
    expect(kanbanWantsUrbanSource(undefined, "all")).toBe(true);
    expect(kanbanWantsTransportSource(undefined, "all")).toBe(true);
    expect(kanbanWantsUrbanSource([], undefined)).toBe(true);
  });

  it("localSources restrito exclui a outra fonte", () => {
    expect(kanbanWantsTransportSource(["urban"], "all")).toBe(false);
    expect(kanbanWantsUrbanSource(["urban"], "all")).toBe(true);
    expect(kanbanWantsTransportSource(["transport"], "all")).toBe(true);
  });
});

describe("kanbanHasGlobalRecorte", () => {
  it("falso sem recorte algum", () => {
    expect(kanbanHasGlobalRecorte({})).toBe(false);
    expect(kanbanHasGlobalRecorte({ globalRegion: "all", globalCategory: "all" })).toBe(false);
  });
  it("verdadeiro com data, região ou categoria específica", () => {
    expect(kanbanHasGlobalRecorte({ createdFrom: new Date() })).toBe(true);
    expect(kanbanHasGlobalRecorte({ createdTo: new Date() })).toBe(true);
    expect(kanbanHasGlobalRecorte({ globalRegion: "Zona Leste" })).toBe(true);
    expect(kanbanHasGlobalRecorte({ globalCategory: "iluminacao" })).toBe(true);
  });
});

describe("applyKanbanDateRange", () => {
  it("aplica gte/lte quando há datas", () => {
    const q = fakeQuery();
    applyKanbanDateRange(q, {
      createdFrom: new Date("2026-01-01"),
      createdTo: new Date("2026-02-01"),
    });
    expect(q.gte).toHaveBeenCalledWith("created_at", expect.any(String));
    expect(q.lte).toHaveBeenCalledWith("created_at", expect.any(String));
  });
  it("não aplica nada sem datas", () => {
    const q = fakeQuery();
    applyKanbanDateRange(q, {});
    expect(q.gte).not.toHaveBeenCalled();
    expect(q.lte).not.toHaveBeenCalled();
  });
});

describe("applyKanbanUrbanCategory / applyKanbanTransportCategory", () => {
  it("'all' → não filtra", () => {
    const qu = fakeQuery();
    applyKanbanUrbanCategory(qu, "all");
    expect(qu.in).not.toHaveBeenCalled();
    const qt = fakeQuery();
    applyKanbanTransportCategory(qt, "all");
    expect(qt.in).not.toHaveBeenCalled();
  });
  it("categoria específica → filtra a coluna correta", () => {
    const qu = fakeQuery();
    applyKanbanUrbanCategory(qu, "iluminacao");
    expect(qu.in).toHaveBeenCalledWith("category", expect.arrayContaining(["iluminacao"]));
    const qt = fakeQuery();
    applyKanbanTransportCategory(qt, "iluminacao");
    expect(qt.in).toHaveBeenCalledWith("report_type", expect.arrayContaining(["iluminacao"]));
  });
});

describe("kanbanUrbanRowMatchesRegion / kanbanTransportRowMatchesRegion", () => {
  it("região 'all'/ausente → sempre casa", () => {
    expect(kanbanUrbanRowMatchesRegion({ neighborhood: "Tatuapé" }, "all")).toBe(true);
    expect(kanbanUrbanRowMatchesRegion({ neighborhood: "Tatuapé" }, undefined)).toBe(true);
    expect(kanbanTransportRowMatchesRegion({ location: "Centro" }, "all")).toBe(true);
    expect(kanbanTransportRowMatchesRegion({ location: "Centro" }, undefined)).toBe(true);
  });
  it("com região específica → delega à lógica de zona (retorna boolean)", () => {
    expect(typeof kanbanUrbanRowMatchesRegion({ neighborhood: "Tatuapé" }, "leste")).toBe(
      "boolean",
    );
    expect(
      typeof kanbanTransportRowMatchesRegion({ location: "Sé", stop_name: "Centro" }, "centro"),
    ).toBe("boolean");
  });
});
