import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { useWidgetTheme, WidgetThemeProvider } from "@/contexts/WidgetThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const useAuthMock = vi.mocked(useAuth);
const supabaseFromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

function mockSelect(result: { data: unknown; error: unknown | null }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

function mockUpsert(result: { error: unknown | null }) {
  const chain: Record<string, unknown> = {};
  chain.upsert = vi.fn(() => Promise.resolve(result));
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(WidgetThemeProvider, null, children);
}

describe("useWidgetTheme (via WidgetThemeProvider)", () => {
  beforeEach(() => {
    // shouldAdvanceTime: o relógio falso acompanha o tempo real, então o polling
    // interno do waitFor() dispara (senão trava e estoura o timeout de 5s);
    // vi.advanceTimersByTime continua válido para testar o debounce do upsert.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useAuthMock.mockReturnValue({
      // @ts-expect-error — partial mock só com o que o provider usa
      user: { id: "user-1" },
    });
    supabaseFromMock.mockReset();
  });

  it("começa com 'geral' enquanto carrega e isLoading=true", () => {
    supabaseFromMock.mockReturnValue(mockSelect({ data: null, error: null }));
    const { result } = renderHook(() => useWidgetTheme(), { wrapper });
    expect(result.current.theme).toBe("geral");
    expect(result.current.isLoading).toBe(true);
  });

  it("carrega tema persistido do servidor", async () => {
    supabaseFromMock.mockReturnValue(
      mockSelect({
        data: { theme: "saude", widget_config: { version: 1 } },
        error: null,
      }),
    );
    const { result } = renderHook(() => useWidgetTheme(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.theme).toBe("saude");
  });

  it("setTheme dispara upsert após debounce e propaga para outros consumidores", async () => {
    const selectChain = mockSelect({ data: null, error: null });
    const upsertChain = mockUpsert({ error: null });
    supabaseFromMock.mockReturnValueOnce(selectChain).mockReturnValueOnce(upsertChain);

    // Dois consumidores compartilhando o mesmo Provider.
    const { result } = renderHook(() => ({ a: useWidgetTheme(), b: useWidgetTheme() }), {
      wrapper,
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.a.isLoading).toBe(false));

    act(() => {
      result.current.a.setTheme("transporte");
    });

    // Mudança em A reflete imediatamente em B (mesmo Context).
    expect(result.current.a.theme).toBe("transporte");
    expect(result.current.b.theme).toBe("transporte");

    await act(async () => {
      vi.advanceTimersByTime(450);
      await Promise.resolve();
    });
    expect(upsertChain.upsert).toHaveBeenCalledTimes(1);
  });

  it("erro ao carregar do servidor → degrada para 'geral' + expõe error (sem crash) [A1.12]", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    supabaseFromMock.mockReturnValue(
      mockSelect({ data: null, error: { message: "falha de rede" } }),
    );

    const { result } = renderHook(() => useWidgetTheme(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Não crasha; cai no tema default e sinaliza o erro para a UI.
    expect(result.current.theme).toBe("geral");
    expect(result.current.error).toMatch(/não foi possível carregar/i);
    consoleError.mockRestore();
  });

  it("useWidgetTheme fora do Provider lança erro descritivo", () => {
    // Suprime erro do React no console pra não poluir o teste.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useWidgetTheme())).toThrow(/WidgetThemeProvider/i);
    consoleError.mockRestore();
  });
});
