import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { createElement } from "react";
import {
  useUrlSyncedState,
  stringSerializer,
  optionalStringSerializer,
  stringArraySerializer,
  dateRangeSerializer,
} from "./useUrlSyncedState";

function wrapperWithRoute(initialEntries: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(MemoryRouter, { initialEntries }, children);
  };
}

describe("useUrlSyncedState — serializers", () => {
  it("stringSerializer: omite valor padrão da URL", () => {
    const s = stringSerializer("default");
    expect(s.toParam("default")).toBeNull();
    expect(s.toParam("custom")).toBe("custom");
    expect(s.fromParam(null)).toBe("default");
    expect(s.fromParam("x")).toBe("x");
  });

  it("optionalStringSerializer: trata vazio como null", () => {
    const s = optionalStringSerializer();
    expect(s.toParam(null)).toBeNull();
    expect(s.toParam("")).toBeNull();
    expect(s.toParam("foo")).toBe("foo");
    expect(s.fromParam(null)).toBeNull();
    expect(s.fromParam("foo")).toBe("foo");
  });

  it("stringArraySerializer: junta com vírgula e escapa items com vírgula", () => {
    const s = stringArraySerializer();
    expect(s.toParam([])).toBeNull();
    expect(s.toParam(["a", "b", "c"])).toBe("a,b,c");
    expect(s.toParam(["a, b", "c"])).toBe("a%2C b,c");
    expect(s.fromParam(null)).toEqual([]);
    expect(s.fromParam("a,b,c")).toEqual(["a", "b", "c"]);
    expect(s.fromParam("a%2C b,c")).toEqual(["a, b", "c"]);
  });

  it("dateRangeSerializer: formato YYYY-MM-DD~YYYY-MM-DD", () => {
    const s = dateRangeSerializer();
    expect(s.toParam(null)).toBeNull();
    expect(s.toParam({ startDate: "2026-01-01", endDate: "2026-01-31" })).toBe(
      "2026-01-01~2026-01-31",
    );
    expect(s.toParam({ startDate: "2026-01-01" })).toBe("2026-01-01~");
    expect(s.fromParam("2026-01-01~2026-01-31")).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    expect(s.fromParam(null)).toBeNull();
    expect(s.fromParam("")).toBeNull();
  });
});

describe("useUrlSyncedState — hook", () => {
  it("hidrata estado a partir da URL inicial", () => {
    const { result } = renderHook(
      () =>
        useUrlSyncedState<{ tab: string; cat: string | null }>({
          defaults: { tab: "volume", cat: null },
          serializers: {
            tab: stringSerializer("volume"),
            cat: optionalStringSerializer(),
          },
        }),
      { wrapper: wrapperWithRoute(["/?tab=drill&cat=Iluminacao"]) },
    );
    expect(result.current[0].tab).toBe("drill");
    expect(result.current[0].cat).toBe("Iluminacao");
  });

  it("usa valores default quando não há params", () => {
    const { result } = renderHook(
      () =>
        useUrlSyncedState<{ tab: string }>({
          defaults: { tab: "volume" },
          serializers: { tab: stringSerializer("volume") },
        }),
      { wrapper: wrapperWithRoute(["/"]) },
    );
    expect(result.current[0].tab).toBe("volume");
  });

  it("setState atualiza state local imediatamente", () => {
    const { result } = renderHook(
      () =>
        useUrlSyncedState<{ tab: string }>({
          defaults: { tab: "volume" },
          serializers: { tab: stringSerializer("volume") },
        }),
      { wrapper: wrapperWithRoute(["/"]) },
    );
    act(() => {
      result.current[1]({ tab: "drill" });
    });
    expect(result.current[0].tab).toBe("drill");
  });

  it("setState com função recebe estado anterior", () => {
    const { result } = renderHook(
      () =>
        useUrlSyncedState<{ count: string }>({
          defaults: { count: "0" },
          serializers: { count: stringSerializer("0") },
        }),
      { wrapper: wrapperWithRoute(["/"]) },
    );
    act(() => {
      result.current[1]((prev) => ({ count: String(parseInt(prev.count, 10) + 1) }));
    });
    expect(result.current[0].count).toBe("1");
  });

  it("hidrata corretamente prefixos compostos", () => {
    const { result } = renderHook(
      () =>
        useUrlSyncedState<{ z: string | null; b: string | null }>({
          prefix: "ter",
          defaults: { z: null, b: null },
          serializers: {
            z: optionalStringSerializer(),
            b: optionalStringSerializer(),
          },
        }),
      {
        wrapper: wrapperWithRoute(["/?ter.z=Zona%20Norte&ter.b=Tatuape"]),
      },
    );
    expect(result.current[0].z).toBe("Zona Norte");
    expect(result.current[0].b).toBe("Tatuape");
  });

  it("hidrata array a partir de string CSV na URL", () => {
    const { result } = renderHook(
      () =>
        useUrlSyncedState<{ cats: string[] }>({
          prefix: "vol",
          defaults: { cats: [] },
          serializers: { cats: stringArraySerializer() },
        }),
      { wrapper: wrapperWithRoute(["/?vol.cats=A,B,C"]) },
    );
    expect(result.current[0].cats).toEqual(["A", "B", "C"]);
  });
});
