import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { usePendingRatings } from "./usePendingRatings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function createSelectChain(result: { data: unknown; error: unknown | null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = chain as Record<string, unknown> & { then: typeof Promise.prototype.then };
  const p = Promise.resolve(result);
  self.then = p.then.bind(p);
  self.catch = p.catch.bind(p);
  self.select = vi.fn(() => self);
  self.eq = vi.fn(() => self);
  self.gt = vi.fn(() => self);
  self.order = vi.fn(() => self);
  self.limit = vi.fn(() => self);
  return self;
}

describe("usePendingRatings", () => {
  const mockUser = { id: "user-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: mockUser as any, loading: false } as any);
  });

  it("deve buscar avaliações pendentes com sucesso", async () => {
    const mockData = [
      { id: "1", service_id: "s1", status: "pending", service: { name: "Service 1" } },
    ];

    vi.mocked(supabase.from).mockReturnValue(
      createSelectChain({ data: mockData, error: null }) as ReturnType<typeof supabase.from>,
    );

    const { result } = renderHook(() => usePendingRatings());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.pendingRatings).toEqual(mockData);
  });

  it("deve marcar como ignorado (skipped) com sucesso", async () => {
    const mockData = [
      { id: "visit-1", service_id: "s1", status: "pending", service: { name: "Service 1" } },
    ];

    const finalEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn().mockReturnValue({ eq: finalEq });

    vi.mocked(supabase.from).mockImplementation(() => {
      const fetchChain = createSelectChain({ data: mockData, error: null });
      return {
        ...fetchChain,
        update: vi.fn().mockReturnValue({ eq: firstEq }),
      } as ReturnType<typeof supabase.from>;
    });

    const { result } = renderHook(() => usePendingRatings());

    await act(async () => {
      await Promise.resolve();
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
    vi.mocked(supabase.from).mockReturnValue(
      createSelectChain({ data: null, error: new Error(errorMessage) }) as ReturnType<typeof supabase.from>,
    );

    const { result } = renderHook(() => usePendingRatings());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);

    expect(result.current.error).toBe(errorMessage);
    expect(toast.error).toHaveBeenCalledWith(errorMessage);
  });
});
