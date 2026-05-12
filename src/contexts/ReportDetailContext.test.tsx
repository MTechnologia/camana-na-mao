import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { ReportDetailProvider, useReportDetailModal } from "./ReportDetailContext";

function wrap({ children }: { children: ReactNode }) {
  return createElement(ReportDetailProvider, null, children);
}

describe("useReportDetailModal", () => {
  it("estado inicial é null (nada aberto)", () => {
    const { result } = renderHook(() => useReportDetailModal(), { wrapper: wrap });
    expect(result.current.opened).toBeNull();
  });

  it("open(id, source) define o estado", () => {
    const { result } = renderHook(() => useReportDetailModal(), { wrapper: wrap });
    act(() => {
      result.current.open("abc-123", "urban");
    });
    expect(result.current.opened).toEqual({ id: "abc-123", source: "urban" });
  });

  it("close() volta para null", () => {
    const { result } = renderHook(() => useReportDetailModal(), { wrapper: wrap });
    act(() => result.current.open("x", "transport"));
    expect(result.current.opened).not.toBeNull();
    act(() => result.current.close());
    expect(result.current.opened).toBeNull();
  });

  it("trocar relato substitui o anterior (não acumula)", () => {
    const { result } = renderHook(() => useReportDetailModal(), { wrapper: wrap });
    act(() => result.current.open("a", "urban"));
    act(() => result.current.open("b", "transport"));
    expect(result.current.opened).toEqual({ id: "b", source: "transport" });
  });

  it("uso fora do Provider retorna fallback no-op (não quebra)", () => {
    const { result } = renderHook(() => useReportDetailModal());
    expect(result.current.opened).toBeNull();
    // Não deve lançar
    expect(() => result.current.open("x", "urban")).not.toThrow();
    expect(() => result.current.close()).not.toThrow();
  });
});
