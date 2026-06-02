import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

import { createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { useTransportReport } from "./useTransportReport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

describe("useTransportReport", () => {
  const mockUser = { id: "user-123" };
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser } as any, error: null });
  });

  it("deve enviar um relato com sucesso", async () => {
    const reportData = {
      report_type: "delay",
      occurrence_date: "2024-04-07",
      description: "Test description",
    };

    const mockResponse = { id: "report-1", ...reportData };

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockResponse, error: null }),
    } as any);

    const { result } = renderHook(() => useTransportReport());

    let response;
    await act(async () => {
      response = await result.current.submitReport(reportData);
    });

    expect(response).toEqual(mockResponse);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Relato enviado!",
      }),
    );
  });

  it("deve buscar meus relatos com sucesso", async () => {
    const mockReports = [{ id: "1", report_type: "delay" }];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockReports, error: null }),
    } as any);

    const { result } = renderHook(() => useTransportReport());

    let reports;
    await act(async () => {
      reports = await result.current.getMyReports();
    });

    expect(reports).toEqual(mockReports);
  });

  it("deve lidar com erro no envio", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("Network error") }),
    } as any);

    const { result } = renderHook(() => useTransportReport());

    await act(async () => {
      try {
        await result.current.submitReport({ report_type: "delay", occurrence_date: "2024-01-01" });
      } catch {
        // Expected
      }
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "Erro ao enviar relato",
      }),
    );
  });
});
