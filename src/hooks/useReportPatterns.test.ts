import { renderHook, waitFor } from "@testing-library/react";
import { useReportPatterns } from "./useReportPatterns";
import { supabase } from "@/integrations/supabase/client";
import { vi, describe, it, expect, beforeEach } from "vitest";

describe("useReportPatterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar padrões com sucesso", async () => {
    const mockData = [
      { id: "1", description: "Pattern 1", occurrence_count: 10, status: "active" },
    ];

    vi.mocked(supabase.from).mockReturnValue({
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
  });

  it("deve usar mockPatterns quando o banco retornar vazio", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useReportPatterns());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.patterns.length).toBeGreaterThan(0);
    expect(result.current.patterns[0].id).toContain("mock-");
  });

  it("deve filtrar por lineId se fornecido", async () => {
    const lineId = "line-123";
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: mockEq,
      order: mockOrder,
    } as any);

    renderHook(() => useReportPatterns(lineId));

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalled();
    });

    expect(mockEq).toHaveBeenCalledWith("status", "active");
  });
});
