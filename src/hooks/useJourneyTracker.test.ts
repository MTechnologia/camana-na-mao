import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useJourneyTracker } from "@/hooks/useJourneyTracker";

describe("useJourneyTracker", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("restaura tracker do sessionStorage ao mudar conversationId", () => {
    sessionStorage.setItem(
      "cmsp_tracker_conv-1",
      JSON.stringify({ type: "urban_report", fields: { category: "lixo" } }),
    );

    const { result } = renderHook(() => useJourneyTracker("conv-1"));

    expect(result.current.collectionType).toBe("urban_report");
    expect(result.current.collectedFields.category).toBe("lixo");
  });

  it("persiste alterações no sessionStorage", () => {
    const { result } = renderHook(() => useJourneyTracker("conv-2"));

    act(() => {
      result.current.setCollectionType("transport_report");
      result.current.setCollectedFields({ line_code: "8000" });
    });

    const saved = JSON.parse(sessionStorage.getItem("cmsp_tracker_conv-2") || "{}");
    expect(saved.type).toBe("transport_report");
    expect(saved.fields.line_code).toBe("8000");
  });

  it("resetTrackerForNewConversation limpa estado e storage", () => {
    const { result } = renderHook(() => useJourneyTracker("conv-3"));

    act(() => {
      result.current.setCollectionType("urban_report");
      result.current.setCollectedFields({ description: "teste" });
    });

    act(() => {
      result.current.resetTrackerForNewConversation();
    });

    expect(result.current.collectionType).toBeNull();
    expect(result.current.collectedFields).toEqual({});
    expect(sessionStorage.getItem("cmsp_tracker_conv-3")).toBeNull();
  });
});
