import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { renderHook, act } from "@testing-library/react";
import { useVisitDetection } from "./useVisitDetection";
import { supabase } from "@/integrations/supabase/client";

/** Builder thenável para cadeias `.select().eq()…` usadas na hidratação e na query de 24h. */
function serviceVisitsTableMock(visitIdForInsert: string) {
  const emptyList = Promise.resolve({ data: [] as unknown[], error: null });
  const b: Record<string, unknown> = {};
  const self = b as Record<string, unknown> & { then: typeof Promise.prototype.then };
  self.then = emptyList.then.bind(emptyList);
  self.catch = emptyList.catch.bind(emptyList);
  self.select = vi.fn(() => self);
  self.eq = vi.fn(() => self);
  self.is = vi.fn(() => self);
  self.in = vi.fn(() => self);
  self.gte = vi.fn(() => self);

  self.insert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: { id: visitIdForInsert }, error: null })),
    })),
  }));

  const updateDone = Promise.resolve({ error: null });
  self.update = vi.fn(() => {
    const u: Record<string, unknown> = {};
    const uSelf = u as Record<string, unknown> & { then: typeof Promise.prototype.then };
    uSelf.then = updateDone.then.bind(updateDone);
    uSelf.catch = updateDone.catch.bind(updateDone);
    uSelf.eq = vi.fn(() => uSelf);
    uSelf.is = vi.fn(() => uSelf);
    return uSelf;
  });

  return self;
}

function defaultFromMock(visitIdForInsert = "visit-999") {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === "notifications") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) } as ReturnType<typeof supabase.from>;
    }
    return serviceVisitsTableMock(visitIdForInsert) as ReturnType<typeof supabase.from>;
  });
}

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
    defaultFromMock();
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
      }),
    );

    expect(result.current.detectedVisit).toBeNull();
  });

  it("deve iniciar o monitoramento quando o usuário estiver perto de um serviço", async () => {
    renderHook(() =>
      useVisitDetection({
        latitude: -23.5505,
        longitude: -46.6333,
        services: [mockService],
        userId: mockUserId,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(11 * 60 * 1000);
    });
  });

  it("deve criar uma visita e notificação após 10 minutos de permanência", async () => {
    const mockVisitId = "visit-999";

    const mockSingle = vi.fn().mockResolvedValue({ data: { id: mockVisitId }, error: null });
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "notifications") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) } as ReturnType<typeof supabase.from>;
      }
      if (table === "service_visits") {
        const base = serviceVisitsTableMock(mockVisitId) as Record<string, ReturnType<typeof vi.fn>>;
        base.insert = mockInsert;
        return base as ReturnType<typeof supabase.from>;
      }
      return serviceVisitsTableMock(mockVisitId) as ReturnType<typeof supabase.from>;
    });

    const { result } = renderHook(() =>
      useVisitDetection({
        latitude: -23.5505,
        longitude: -46.6333,
        services: [mockService],
        userId: mockUserId,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(11 * 60 * 1000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUserId,
        service_id: mockService.id,
        status: "pending",
      }),
    );

    expect(result.current.detectedVisit).toEqual({
      visitId: mockVisitId,
      serviceName: mockService.name,
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
      },
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    rerender({
      latitude: -23.6,
      longitude: -46.7,
      services: [mockService],
      userId: mockUserId,
    });

    await act(async () => {
      vi.advanceTimersByTime(6 * 60 * 1000);
    });

    expect(result.current.detectedVisit).toBeNull();
  });
});
