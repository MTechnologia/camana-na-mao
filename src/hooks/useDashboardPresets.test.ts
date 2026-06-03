import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { useDashboardPresets } from "./useDashboardPresets";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const useAuthMock = vi.mocked(useAuth);
const supabaseFromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

interface SupabaseChain {
  [key: string]: unknown;
}

function makeChain(result: { data?: unknown; error?: unknown | null }) {
  const chain: SupabaseChain = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  // Permite usar await diretamente (sem .single ou .maybeSingle).
  const p = Promise.resolve(result);
  chain.then = p.then.bind(p);
  chain.catch = p.catch.bind(p);
  return chain;
}

describe("useDashboardPresets", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      // @ts-expect-error partial mock
      user: { id: "user-1" },
    });
    supabaseFromMock.mockReset();
  });

  it("retorna lista vazia e isLoading=true inicialmente", () => {
    supabaseFromMock.mockReturnValue(makeChain({ data: [], error: null }));
    const { result } = renderHook(() => useDashboardPresets());
    expect(result.current.presets).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("carrega presets do banco", async () => {
    supabaseFromMock.mockReturnValue(
      makeChain({
        data: [
          {
            id: "p1",
            user_id: "user-1",
            name: "Saúde",
            theme: "saude",
            config: {},
            is_default: true,
            created_at: "2026-05-01T00:00:00Z",
            updated_at: "2026-05-01T00:00:00Z",
          },
        ],
        error: null,
      }),
    );

    const { result } = renderHook(() => useDashboardPresets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].name).toBe("Saúde");
    expect(result.current.defaultPreset?.id).toBe("p1");
  });

  it("create() chama insert e atualiza lista local otimisticamente", async () => {
    const selectChain = makeChain({ data: [], error: null });
    const insertChain = makeChain({
      data: {
        id: "p2",
        user_id: "user-1",
        name: "Transporte",
        theme: "transporte",
        config: {},
        is_default: false,
        created_at: "2026-05-11T00:00:00Z",
        updated_at: "2026-05-11T00:00:00Z",
      },
      error: null,
    });
    supabaseFromMock
      .mockReturnValueOnce(selectChain) // select inicial
      .mockReturnValueOnce(insertChain); // insert

    const { result } = renderHook(() => useDashboardPresets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created: unknown;
    await act(async () => {
      created = await result.current.create({ name: "Transporte", theme: "transporte" });
    });
    expect(created).toBeTruthy();
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].name).toBe("Transporte");
  });

  it("remove() filtra a lista local e chama delete", async () => {
    const selectChain = makeChain({
      data: [
        {
          id: "p1",
          user_id: "user-1",
          name: "Saúde",
          theme: "saude",
          config: {},
          is_default: false,
          created_at: "2026-05-01T00:00:00Z",
          updated_at: "2026-05-01T00:00:00Z",
        },
      ],
      error: null,
    });
    const deleteChain = makeChain({ error: null });
    supabaseFromMock.mockReturnValueOnce(selectChain).mockReturnValueOnce(deleteChain);

    const { result } = renderHook(() => useDashboardPresets());
    await waitFor(() => expect(result.current.presets).toHaveLength(1));

    await act(async () => {
      await result.current.remove("p1");
    });
    expect(result.current.presets).toHaveLength(0);
  });

  it("setDefault() marca o preset como padrão e desmarca outros (otimista)", async () => {
    const selectChain = makeChain({
      data: [
        {
          id: "p1",
          user_id: "user-1",
          name: "Saúde",
          theme: "saude",
          config: {},
          is_default: true,
          created_at: "2026-05-01T00:00:00Z",
          updated_at: "2026-05-01T00:00:00Z",
        },
        {
          id: "p2",
          user_id: "user-1",
          name: "Transporte",
          theme: "transporte",
          config: {},
          is_default: false,
          created_at: "2026-05-02T00:00:00Z",
          updated_at: "2026-05-02T00:00:00Z",
        },
      ],
      error: null,
    });
    const updateChain = makeChain({ error: null });
    supabaseFromMock.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const { result } = renderHook(() => useDashboardPresets());
    await waitFor(() => expect(result.current.presets).toHaveLength(2));

    await act(async () => {
      await result.current.setDefault("p2");
    });
    const p1 = result.current.presets.find((p) => p.id === "p1");
    const p2 = result.current.presets.find((p) => p.id === "p2");
    expect(p2?.isDefault).toBe(true);
    expect(p1?.isDefault).toBe(false);
    expect(result.current.defaultPreset?.id).toBe("p2");
  });
});
