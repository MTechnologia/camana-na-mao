import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { createChannelMock, createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { useRealtimeRefresh } from "./useRealtimeRefresh";
import { supabase } from "@/integrations/supabase/client";

// Canal realtime encadeável vindo do mock central (A1.3).
const createMockChannel = () => createChannelMock();

describe("useRealtimeRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("assina canal Supabase para cada tabela informada", () => {
    const ch = createMockChannel();
    vi.spyOn(supabase, "channel").mockReturnValue(
      ch as unknown as ReturnType<typeof supabase.channel>,
    );

    renderHook(() => useRealtimeRefresh(["urban_reports", "transport_reports"], () => {}));

    expect(supabase.channel).toHaveBeenCalledTimes(1);
    expect(ch.on).toHaveBeenCalledTimes(2);
    expect(ch.subscribe).toHaveBeenCalledTimes(1);
  });

  it("não cria canal quando tables está vazio", () => {
    renderHook(() => useRealtimeRefresh([], () => {}));
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it("dispara onChange com debounce de 600ms quando recebe evento", () => {
    const ch = createMockChannel();
    vi.spyOn(supabase, "channel").mockReturnValue(
      ch as unknown as ReturnType<typeof supabase.channel>,
    );

    const onChange = vi.fn();
    renderHook(() => useRealtimeRefresh(["urban_reports"], onChange));

    // Captura o callback registrado em ch.on
    const captured = ch.on.mock.calls[0][2] as () => void;

    // Dispara 3 eventos seguidos — debounce deve coalescer em 1 chamada
    act(() => {
      captured();
      captured();
      captured();
    });

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("atualiza lastUpdate após o debounce disparar", () => {
    const ch = createMockChannel();
    vi.spyOn(supabase, "channel").mockReturnValue(
      ch as unknown as ReturnType<typeof supabase.channel>,
    );

    const { result } = renderHook(() => useRealtimeRefresh(["urban_reports"], () => {}));

    expect(result.current.lastUpdate).toBeNull();

    const captured = ch.on.mock.calls[0][2] as () => void;
    act(() => {
      captured();
      vi.advanceTimersByTime(700);
    });

    expect(result.current.lastUpdate).toBeInstanceOf(Date);
  });

  it("refresh manual atualiza lastUpdate e chama onChange imediatamente", () => {
    const ch = createMockChannel();
    vi.spyOn(supabase, "channel").mockReturnValue(
      ch as unknown as ReturnType<typeof supabase.channel>,
    );

    const onChange = vi.fn();
    const { result } = renderHook(() => useRealtimeRefresh(["urban_reports"], onChange));

    act(() => {
      result.current.refresh();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(result.current.lastUpdate).toBeInstanceOf(Date);
  });

  it("remove canal no unmount", () => {
    const ch = createMockChannel();
    vi.spyOn(supabase, "channel").mockReturnValue(
      ch as unknown as ReturnType<typeof supabase.channel>,
    );
    const removeSpy = vi.spyOn(supabase, "removeChannel");

    const { unmount } = renderHook(() => useRealtimeRefresh(["urban_reports"], () => {}));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(ch);
  });

  // Resiliência (A1.4): realtime indisponível (dev sem backend) NÃO pode
  // derrubar a tela "viva" — o hook segue funcionando sem live updates.
  describe("resiliência sem backend", () => {
    it("não quebra quando supabase.channel lança", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      vi.spyOn(supabase, "channel").mockImplementation(() => {
        throw new Error("realtime indisponível");
      });

      const onChange = vi.fn();
      const { result } = renderHook(() => useRealtimeRefresh(["urban_reports"], onChange));

      // Renderizou sem lançar e o refresh manual continua operante.
      expect(result.current.lastUpdate).toBeNull();
      act(() => {
        result.current.refresh();
      });
      expect(onChange).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it("não quebra quando subscribe() lança", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const ch = createMockChannel();
      ch.subscribe = vi.fn(() => {
        throw new Error("subscribe falhou");
      });
      vi.spyOn(supabase, "channel").mockReturnValue(
        ch as unknown as ReturnType<typeof supabase.channel>,
      );

      expect(() => renderHook(() => useRealtimeRefresh(["urban_reports"], () => {}))).not.toThrow();
      warn.mockRestore();
    });

    it("não quebra no unmount quando removeChannel lança", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const ch = createMockChannel();
      vi.spyOn(supabase, "channel").mockReturnValue(
        ch as unknown as ReturnType<typeof supabase.channel>,
      );
      vi.spyOn(supabase, "removeChannel").mockImplementation(() => {
        throw new Error("removeChannel falhou");
      });

      const { unmount } = renderHook(() => useRealtimeRefresh(["urban_reports"], () => {}));
      expect(() => unmount()).not.toThrow();
      warn.mockRestore();
    });
  });
});
