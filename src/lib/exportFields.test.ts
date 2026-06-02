import { describe, it, expect } from "vitest";
import {
  DATASET_LIST,
  EXPORT_DATASETS,
  EXPORT_ROW_CAPS,
  canAccessField,
  filterFieldsByRole,
  getAllFieldIds,
  getBasicPresetFieldIds,
  getDataset,
  getRowCap,
  groupFields,
  type ExportRole,
} from "./exportFields";

describe("EXPORT_DATASETS", () => {
  it("expõe os 2 datasets (urban + transport)", () => {
    expect(DATASET_LIST).toHaveLength(2);
    expect(EXPORT_DATASETS.urban_reports.id).toBe("urban_reports");
    expect(EXPORT_DATASETS.transport_reports.id).toBe("transport_reports");
  });

  it("cada dataset tem defaultDateColumn e defaultOrderColumn definidos", () => {
    for (const d of DATASET_LIST) {
      expect(d.defaultDateColumn).toBeTruthy();
      expect(d.defaultOrderColumn).toBeTruthy();
    }
  });

  it("ids de campos são únicos dentro de cada dataset", () => {
    for (const d of DATASET_LIST) {
      const ids = d.fields.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("getBasicPresetFieldIds", () => {
  it("inclui ao menos protocol_code, category/report_type, status, created_at", () => {
    const urban = getBasicPresetFieldIds(EXPORT_DATASETS.urban_reports);
    expect(urban).toContain("protocol_code");
    expect(urban).toContain("category");
    expect(urban).toContain("status");
    expect(urban).toContain("created_at");

    const transport = getBasicPresetFieldIds(EXPORT_DATASETS.transport_reports);
    expect(transport).toContain("protocol_code");
    expect(transport).toContain("report_type");
    expect(transport).toContain("status");
    expect(transport).toContain("created_at");
  });

  it("preset 'Básicos' é subconjunto estrito do 'Completo'", () => {
    for (const d of DATASET_LIST) {
      const basico = new Set(getBasicPresetFieldIds(d));
      const completo = new Set(getAllFieldIds(d));
      expect(basico.size).toBeLessThan(completo.size);
      for (const id of basico) {
        expect(completo.has(id)).toBe(true);
      }
    }
  });
});

describe("groupFields", () => {
  it("agrupa em ordem fixa e preserva ordem dentro de cada grupo", () => {
    const grouped = groupFields(EXPORT_DATASETS.urban_reports);
    const groupNames = grouped.map((g) => g.group);
    expect(groupNames).toEqual([
      "Identificação",
      "Conteúdo",
      "Status",
      "Localização",
      "Datas",
      "Avançado",
    ]);
    // Cada grupo só contém campos do próprio grupo
    for (const g of grouped) {
      for (const f of g.fields) {
        expect(f.group).toBe(g.group);
      }
    }
  });

  it("total de campos agrupados == total de campos do dataset", () => {
    const grouped = groupFields(EXPORT_DATASETS.transport_reports);
    const totalGrouped = grouped.reduce((acc, g) => acc + g.fields.length, 0);
    expect(totalGrouped).toBe(EXPORT_DATASETS.transport_reports.fields.length);
  });
});

describe("getDataset()", () => {
  it("retorna o dataset correto por id", () => {
    expect(getDataset("urban_reports").label).toBe("Relatos urbanos");
    expect(getDataset("transport_reports").label).toBe("Relatos de transporte");
  });
});

describe("getRowCap (regressão 'gestor sem relatório')", () => {
  it("gestor recebe cap > 0 em ambos os formatos (não fica sem relatório)", () => {
    expect(getRowCap("gestor", "xlsx")).toBeGreaterThan(0);
    expect(getRowCap("gestor", "csv")).toBeGreaterThan(0);
  });

  it("admin recebe cap > 0 em ambos os formatos", () => {
    expect(getRowCap("admin", "xlsx")).toBeGreaterThan(0);
    expect(getRowCap("admin", "csv")).toBeGreaterThan(0);
  });

  it("role nula → cap 0 (condição que o UI/edge usa para barrar export sem perfil)", () => {
    expect(getRowCap(null, "xlsx")).toBe(0);
    expect(getRowCap(null, "csv")).toBe(0);
  });

  it("admin tem cap >= gestor (precedência de volume)", () => {
    expect(getRowCap("admin", "csv")).toBeGreaterThanOrEqual(getRowCap("gestor", "csv"));
    expect(getRowCap("admin", "xlsx")).toBeGreaterThanOrEqual(getRowCap("gestor", "xlsx"));
  });

  it("a tabela de caps cobre TODA role válida nos 2 formatos (evita undefined[format] em runtime)", () => {
    const roles: ExportRole[] = ["admin", "gestor"];
    for (const role of roles) {
      expect(EXPORT_ROW_CAPS[role]).toBeDefined();
      expect(typeof EXPORT_ROW_CAPS[role].csv).toBe("number");
      expect(typeof EXPORT_ROW_CAPS[role].xlsx).toBe("number");
      // E getRowCap não lança para nenhuma combinação válida.
      expect(() => getRowCap(role, "csv")).not.toThrow();
      expect(() => getRowCap(role, "xlsx")).not.toThrow();
    }
  });
});

describe("filterFieldsByRole / canAccessField", () => {
  it("gestor enxerga ao menos os campos do preset básico (lista não vazia)", () => {
    const visible = filterFieldsByRole(EXPORT_DATASETS.urban_reports.fields, "gestor");
    expect(visible.length).toBeGreaterThan(0);
    const basic = getBasicPresetFieldIds(EXPORT_DATASETS.urban_reports);
    const visibleIds = new Set(visible.map((f) => f.id));
    for (const id of basic) {
      expect(visibleIds.has(id)).toBe(true);
    }
  });

  it("role nula só enxerga campos não-restritos", () => {
    const fields = EXPORT_DATASETS.urban_reports.fields;
    const visible = filterFieldsByRole(fields, null);
    for (const f of visible) {
      expect(canAccessField(f, null)).toBe(true);
      expect(f.restrictedToRoles?.length ?? 0).toBe(0);
    }
  });
});
