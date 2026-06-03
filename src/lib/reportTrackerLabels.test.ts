import { describe, expect, it } from "vitest";
import { formatTrackerFieldValue } from "./reportTrackerLabels";

describe("formatTrackerFieldValue", () => {
  it("formata affected_scope alinhado aos chips", () => {
    expect(formatTrackerFieldValue("affected_scope", "street")).toBe("Toda a rua");
    expect(formatTrackerFieldValue("affected_scope", "individual")).toBe("Só eu");
  });

  it("formata risk_level em português", () => {
    expect(formatTrackerFieldValue("risk_level", "critical")).toBe("Crítico");
  });
});
