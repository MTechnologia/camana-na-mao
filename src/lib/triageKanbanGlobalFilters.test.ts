import { describe, expect, it } from "vitest";
import {
  kanbanWantsTransportSource,
  kanbanWantsUrbanSource,
} from "@/lib/triageKanbanGlobalFilters";

describe("triageKanbanGlobalFilters", () => {
  it("mobilidade inclui urbano e transporte", () => {
    expect(kanbanWantsUrbanSource(undefined, "mobilidade")).toBe(true);
    expect(kanbanWantsTransportSource(undefined, "mobilidade")).toBe(true);
  });

  it("urbanismo não busca transporte; fonte local restringe", () => {
    expect(kanbanWantsUrbanSource(undefined, "urbanismo")).toBe(true);
    expect(kanbanWantsTransportSource(undefined, "urbanismo")).toBe(false);
    expect(kanbanWantsUrbanSource(["transport"], "all")).toBe(false);
  });
});
