import { describe, expect, it } from "vitest";
import { parseOccurrenceTime } from "@/hooks/chat/parseOccurrenceTime";

describe("parseOccurrenceTime", () => {
  it("parse HH:mm e variantes", () => {
    expect(parseOccurrenceTime("14:30")).toBe("14:30");
    expect(parseOccurrenceTime("14h30")).toBe("14:30");
    expect(parseOccurrenceTime("9h")).toBe("09:00");
  });

  it("retorna null para texto vazio ou sem horário", () => {
    expect(parseOccurrenceTime("")).toBeNull();
    expect(parseOccurrenceTime("hoje")).toBeNull();
  });
});
