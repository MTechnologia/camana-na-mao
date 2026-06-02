import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { useReportPatterns } from "./useReportPatterns";
import { supabase } from "@/integrations/supabase/client";

function createQueryChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  };

  return chain;
}

describe("useReportPatterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar padrões com sucesso", async () => {
    const mockData = [
      { id: "1", description: "Pattern 1", occurrence_count: 10, status: "active" },
    ];
    const chain = createQueryChain({ data: mockData, error: null });

    vi.spyOn(supabase, "from").mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { result } = renderHook(() => useReportPatterns());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.patterns).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith("report_patterns");
    expect(chain.eq).toHaveBeenCalledTimes(1);
    expect(chain.eq).toHaveBeenCalledWith("status", "active");
    expect(chain.order).toHaveBeenCalledWith("occurrence_count", { ascending: false });
  });

  it("deve retornar lista vazia quando o banco não tiver padrões", async () => {
    vi.spyOn(supabase, "from").mockReturnValue(
      createQueryChain({ data: [], error: null }) as unknown as ReturnType<typeof supabase.from>,
    );

    const { result } = renderHook(() => useReportPatterns());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.patterns).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("deve expor erro quando a query falhar", async () => {
    vi.spyOn(supabase, "from").mockReturnValue(
      createQueryChain({ data: null, error: { message: "falhou" } }) as unknown as ReturnType<typeof supabase.from>,
    );

    const { result } = renderHook(() => useReportPatterns());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.patterns).toEqual([]);
    expect(result.current.error).toBe("falhou");
  });

  it("deve filtrar por lineId se fornecido", async () => {
    const lineId = "line-123";
    const chain = createQueryChain({ data: [], error: null });

    vi.spyOn(supabase, "from").mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    renderHook(() => useReportPatterns(lineId));

    await waitFor(() => {
      expect(chain.eq).toHaveBeenCalled();
    });

    expect(chain.eq).toHaveBeenCalledTimes(2);
    expect(chain.eq.mock.calls[0]).toEqual(["status", "active"]);
    expect(chain.eq.mock.calls[1]).toEqual(["line_id", lineId]);
  });
});
