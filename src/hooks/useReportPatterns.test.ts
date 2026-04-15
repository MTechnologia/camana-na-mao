import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { useReportPatterns } from "./useReportPatterns";
import { supabase } from "@/integrations/supabase/client";

describe("useReportPatterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar padrões com sucesso", async () => {
    const mockData = [
      { id: "1", description: "Pattern 1", occurrence_count: 10, status: "active" },
    ];

    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as any);

    const { result } = renderHook(() => useReportPatterns());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.patterns).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("deve retornar lista vazia quando o banco não tiver padrões", async () => {
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useReportPatterns());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.patterns).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("deve expor erro quando a query falhar", async () => {
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "falhou" } }),
    } as any);

    const { result } = renderHook(() => useReportPatterns());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.patterns).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it("deve filtrar por lineId se fornecido", async () => {
    const lineId = "line-123";
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.spyOn(supabase, "from").mockReturnValue(chain as any);

    renderHook(() => useReportPatterns(lineId));

    await waitFor(() => {
      expect(chain.eq).toHaveBeenCalled();
    });

    expect(chain.eq).toHaveBeenCalledWith("status", "active");
    expect(chain.eq).toHaveBeenCalledWith("line_id", lineId);
  });
});
