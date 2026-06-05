import { describe, expect, it } from "vitest";
import {
  CITIZEN_EQUIPMENT_SERVICE_TYPES,
  normalizeServiceTypeToDbEnum,
  serviceTypeFriendlyLabel,
} from "@/lib/publicServiceType";

describe("normalizeServiceTypeToDbEnum", () => {
  it("converte rótulos PT e slugs para o enum", () => {
    expect(normalizeServiceTypeToDbEnum("hospitais")).toBe("hospital");
    expect(normalizeServiceTypeToDbEnum("UBS")).toBe("ubs");
    expect(normalizeServiceTypeToDbEnum("bibliotecas")).toBe("library");
    expect(normalizeServiceTypeToDbEnum("")).toBeUndefined();
    expect(normalizeServiceTypeToDbEnum(undefined)).toBeUndefined();
  });
});

describe("CITIZEN_EQUIPMENT_SERVICE_TYPES", () => {
  it("inclui equipamentos relevantes ao munícipe", () => {
    for (const t of ["ubs", "hospital", "school", "library", "ceu", "park"]) {
      expect(CITIZEN_EQUIPMENT_SERVICE_TYPES).toContain(t);
    }
  });

  it("exclui ruído da base (endereços e features de GIS)", () => {
    // transit_station = endereços de rua; other = features de GIS (quadra_viaria_editada…)
    expect(CITIZEN_EQUIPMENT_SERVICE_TYPES).not.toContain("transit_station");
    expect(CITIZEN_EQUIPMENT_SERVICE_TYPES).not.toContain("other");
  });
});

describe("serviceTypeFriendlyLabel", () => {
  it("dá rótulo amigável por tipo (aceita slug e rótulo PT)", () => {
    expect(serviceTypeFriendlyLabel("ceu")).toBe("CEU");
    expect(serviceTypeFriendlyLabel("ceus")).toBe("CEU");
    expect(serviceTypeFriendlyLabel("ubs")).toBe("UBS");
    expect(serviceTypeFriendlyLabel("school")).toBe("escola");
    expect(serviceTypeFriendlyLabel("hospitais")).toBe("hospital");
  });

  it("cai em 'serviço' quando o tipo é desconhecido ou ausente", () => {
    expect(serviceTypeFriendlyLabel(undefined)).toBe("serviço");
    expect(serviceTypeFriendlyLabel("")).toBe("serviço");
  });
});
