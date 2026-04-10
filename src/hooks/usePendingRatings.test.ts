import { renderHook, waitFor, act } from "@testing-library/react";
import { usePendingRatings } from "./usePendingRatings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

describe("usePendingRatings", () => {
  const mockUser = { id: "user-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: mockUser as any, loading: false });
  });

  it("deve buscar avaliações pendentes com sucesso", async () => {
    const mockData = [
      { id: "1", service_id: "s1", status: "pending", service: { name: "Service 1" } },
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as any);

    const { result } = renderHook(() => usePendingRatings());

    // Não usar waitFor com fakeTimers para promessas que dependem de useEffect
    // Vamos avançar o tempo ou esperar a promessa resolver
    await act(async () => {
      // O useEffect chama fetchPendingRatings que é async
      // Precisamos dar um tempo para as promessas resolverem
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.pendingRatings).toEqual(mockData);
  });

  it("deve marcar como ignorado (skipped) com sucesso", async () => {
    const mockData = [
      { id: "visit-1", service_id: "s1", status: "pending", service: { name: "Service 1" } },
    ];

    // Mock para o fetch inicial e update
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockImplementation((col, val) => {
      if (col === "id" && val === "visit-1") {
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: mockUpdate,
      eq: mockEq,
    } as any);

    const { result } = renderHook(() => usePendingRatings());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.pendingRatings.length).toBe(1);

    await act(async () => {
      await result.current.markAsSkipped("visit-1");
    });

    expect(result.current.pendingRatings.length).toBe(0);
    expect(toast.success).toHaveBeenCalledWith("Avaliação dispensada");
  });

  it("deve lidar com erro ao buscar avaliações", async () => {
    const errorMessage = "Fetch error";
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error(errorMessage) }),
    } as any);

    const { result } = renderHook(() => usePendingRatings());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);

    expect(result.current.error).toBe(errorMessage);
    expect(toast.error).toHaveBeenCalledWith(errorMessage);
  });
});
