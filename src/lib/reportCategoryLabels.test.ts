import { describe, expect, it } from "vitest";
import { formatReportCategoryLabel } from "@/lib/reportCategoryLabels";

describe("formatReportCategoryLabel", () => {
  it("mapeia chaves urbanas conhecidas", () => {
    expect(formatReportCategoryLabel("via_publica")).toBe("Via pública");
    expect(formatReportCategoryLabel("higiene_urbana")).toBe("Higiene urbana");
  });

  it("humaniza chave desconhecida sem underscore literal na UI", () => {
    expect(formatReportCategoryLabel("foo_bar")).toBe("Foo Bar");
  });

  it("trata vazio", () => {
    expect(formatReportCategoryLabel("")).toBe("Não informado");
  });
});
