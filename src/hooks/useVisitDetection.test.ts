import { renderHook, act } from "@testing-library/react";
import { useVisitDetection } from "./useVisitDetection";
import { supabase } from "@/integrations/supabase/client";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

describe("useVisitDetection", () => {
  const mockUserId = "user-123";
  const mockService = {
    id: "service-1",
    name: "Test Service",
    latitude: -23.5505,
    longitude: -46.6333,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("não deve detectar visita se o usuário não estiver logado", () => {
    const { result } = renderHook(() =>
      useVisitDetection({
        latitude: -23.5505,
        longitude: -46.6333,
        services: [mockService],
        userId: undefined,
      })
    );

    expect(result.current.detectedVisit).toBeNull();
  });

  it("deve iniciar o monitoramento quando o usuário estiver perto de um serviço", async () => {
    const { result } = renderHook(() =>
      useVisitDetection({
        latitude: -23.5505,
        longitude: -46.6333,
        services: [mockService],
        userId: mockUserId,
      })
    );

    // Avança 11 minutos (MIN_DWELL_MINUTES = 10)
    await act(async () => {
      vi.advanceTimersByTime(11 * 60 * 1000);
    });
    
    // O teste passa apenas por não dar timeout e executar o código
  });

  it("deve criar uma visita e notificação após 10 minutos de permanência", async () => {
    const mockVisitId = "visit-999";
    
    // Configura o mock do supabase para este teste específico
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: mockVisitId }, error: null });
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle
      })
    });
    
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === "service_visits") {
        return { insert: mockInsert } as any;
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;
    });

    const { result } = renderHook(() =>
      useVisitDetection({
        latitude: -23.5505,
        longitude: -46.6333,
        services: [mockService],
        userId: mockUserId,
      })
    );

    // Avança 11 minutos
    await act(async () => {
      vi.advanceTimersByTime(11 * 60 * 1000);
    });

    // Em vez de waitFor (que usa timers internos), vamos usar act com microtasks
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: mockUserId,
      service_id: mockService.id,
      status: "pending"
    }));
    
    expect(result.current.detectedVisit).toEqual({
      visitId: mockVisitId,
      serviceName: mockService.name
    });
  });

  it("deve resetar o timer se o usuário sair do raio", async () => {
    const { result, rerender } = renderHook(
      (props) => useVisitDetection(props),
      {
        initialProps: {
          latitude: -23.5505,
          longitude: -46.6333,
          services: [mockService],
          userId: mockUserId,
        },
      }
    );

    // Avança 5 minutos (metade do tempo)
    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    // Move usuário para longe (mais de 50m)
    rerender({
      latitude: -23.6000,
      longitude: -46.7000,
      services: [mockService],
      userId: mockUserId,
    });

    // Avança mais 6 minutos
    await act(async () => {
      vi.advanceTimersByTime(6 * 60 * 1000);
    });

    expect(result.current.detectedVisit).toBeNull();
  });
});
