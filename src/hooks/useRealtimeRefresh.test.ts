import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { useRealtimeRefresh } from "./useRealtimeRefresh";
import { supabase } from "@/integrations/supabase/client";

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
}

function createMockChannel(): MockChannel {
  const ch = {} as MockChannel;
  ch.on = vi.fn().mockReturnValue(ch);
  ch.subscribe = vi.fn().mockReturnValue(ch);
  return ch;
}

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
    vi.spyOn(supabase, "channel").mockReturnValue(ch as unknown as ReturnType<typeof supabase.channel>);

    renderHook(() =>
      useRealtimeRefresh(["urban_reports", "transport_reports"], () => {}),
    );

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
    vi.spyOn(supabase, "channel").mockReturnValue(ch as unknown as ReturnType<typeof supabase.channel>);

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
    vi.spyOn(supabase, "channel").mockReturnValue(ch as unknown as ReturnType<typeof supabase.channel>);

    const { result } = renderHook(() =>
      useRealtimeRefresh(["urban_reports"], () => {}),
    );

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
    vi.spyOn(supabase, "channel").mockReturnValue(ch as unknown as ReturnType<typeof supabase.channel>);

    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeRefresh(["urban_reports"], onChange),
    );

    act(() => {
      result.current.refresh();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(result.current.lastUpdate).toBeInstanceOf(Date);
  });

  it("remove canal no unmount", () => {
    const ch = createMockChannel();
    vi.spyOn(supabase, "channel").mockReturnValue(ch as unknown as ReturnType<typeof supabase.channel>);
    const removeSpy = vi.spyOn(supabase, "removeChannel");

    const { unmount } = renderHook(() =>
      useRealtimeRefresh(["urban_reports"], () => {}),
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(ch);
  });
});
