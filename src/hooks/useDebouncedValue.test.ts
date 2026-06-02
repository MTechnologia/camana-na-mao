import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna o valor inicial imediatamente", () => {
    const { result } = renderHook(() => useDebouncedValue("foo", 300));
    expect(result.current).toBe("foo");
  });

  it("não atualiza antes do delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "foo" },
    });

    rerender({ value: "bar" });
    expect(result.current).toBe("foo");

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("foo");
  });

  it("atualiza após o delay completo sem novas mudanças", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "foo" },
    });

    rerender({ value: "bar" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("bar");
  });

  it("reinicia o timer a cada mudança (multisseleção rápida)", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: ["a"] as string[] },
    });

    rerender({ value: ["a", "b"] });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: ["a", "b", "c"] });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Ainda não passou 300ms desde a última mudança.
    expect(result.current).toEqual(["a"]);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    // Agora total 300ms desde a última mudança → atualiza para o último valor.
    expect(result.current).toEqual(["a", "b", "c"]);
  });

  it("delay=0 propaga sincronicamente no próximo render", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 0), {
      initialProps: { value: 1 },
    });
    rerender({ value: 2 });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toBe(2);
  });

  it("cancela o timer pendente em unmount", () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "a" },
    });
    rerender({ value: "b" });
    unmount();
    // Avançar o tempo não deve causar nenhum erro de setState após unmount.
    act(() => {
      vi.advanceTimersByTime(500);
    });
  });
});
