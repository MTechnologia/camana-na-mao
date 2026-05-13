import { describe, it, expect } from "vitest";
import {
  DATASET_LIST,
  EXPORT_DATASETS,
  getAllFieldIds,
  getBasicPresetFieldIds,
  getDataset,
  groupFields,
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
