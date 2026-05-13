import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { WidgetThemeId, WidgetConfig } from "@/lib/widgetThemes";

/**
 * HU-6.2 — Presets nomeados de dashboard (configurações salvas) por gestor.
 *
 * Mantém a lista do usuário em memória + realtime subscription pra refletir
 * mudanças feitas em outras sessões/dispositivos. Operações otimistas: atualiza
 * o array local imediatamente e reverte em caso de erro.
 *
 * Estrutura do `config` é extensível; hoje guarda apenas o tema (espelhado em
 * `theme` na coluna principal), mas futuras HUs podem adicionar filtros, abas,
 * layout etc. sem migration.
 */

const TABLE = "admin_dashboard_presets" as const;
const REALTIME_TABLES = [TABLE] as const;

export interface DashboardPreset {
  id: string;
  userId: string;
  name: string;
  theme: WidgetThemeId;
  config: WidgetConfig;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePresetInput {
  name: string;
  theme: WidgetThemeId;
  config?: WidgetConfig;
  isDefault?: boolean;
}

export interface UpdatePresetInput {
  name?: string;
  theme?: WidgetThemeId;
  config?: WidgetConfig;
  isDefault?: boolean;
}

export interface UseDashboardPresetsResult {
  presets: DashboardPreset[];
  defaultPreset: DashboardPreset | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: CreatePresetInput) => Promise<DashboardPreset | null>;
  update: (id: string, patch: UpdatePresetInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
}

interface RawRow {
  id: string;
  user_id: string;
  name: string;
  theme: string;
  config: unknown;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

function toModel(row: RawRow): DashboardPreset {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    theme: row.theme as WidgetThemeId,
    config: (row.config as WidgetConfig) ?? {},
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useDashboardPresets(): UseDashboardPresetsResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [presets, setPresets] = useState<DashboardPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setPresets([]);
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const { data, error: selectError } = await supabase
        .from(TABLE)
        .select("id, user_id, name, theme, config, is_default, created_at, updated_at")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });
      if (selectError) throw selectError;
      setPresets((data ?? []).map((r) => toModel(r as RawRow)));
    } catch (err) {
      console.error("[useDashboardPresets] fetch error", err);
      setError("Não foi possível carregar as configurações salvas.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Realtime: refresh em qualquer mudança da tabela. RLS limita a observação
  // ao próprio user, mas o useRealtimeRefresh apenas dispara o fetch.
  useRealtimeRefresh(REALTIME_TABLES, fetchData);

  const create = useCallback(
    async (input: CreatePresetInput): Promise<DashboardPreset | null> => {
      if (!userId) return null;
      const payload = {
        user_id: userId,
        name: input.name.trim(),
        theme: input.theme,
        config: input.config ?? {},
        is_default: input.isDefault ?? false,
      };
      try {
        const { data, error: insertError } = await supabase
          .from(TABLE)
          .insert(payload)
          .select("id, user_id, name, theme, config, is_default, created_at, updated_at")
          .single();
        if (insertError) throw insertError;
        const model = toModel(data as RawRow);
        // Otimista: insere localmente. Realtime confirma logo em seguida.
        setPresets((prev) => sortPresets([...prev, model]));
        return model;
      } catch (err) {
        console.error("[useDashboardPresets] create error", err);
        setError("Não foi possível salvar a configuração.");
        return null;
      }
    },
    [userId],
  );

  const update = useCallback(
    async (id: string, patch: UpdatePresetInput): Promise<void> => {
      if (!userId) return;
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name.trim();
      if (patch.theme !== undefined) dbPatch.theme = patch.theme;
      if (patch.config !== undefined) dbPatch.config = patch.config;
      if (patch.isDefault !== undefined) dbPatch.is_default = patch.isDefault;
      if (Object.keys(dbPatch).length === 0) return;

      // Otimista
      const prevList = presets;
      setPresets((prev) =>
        sortPresets(
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
                  ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
                  ...(patch.config !== undefined ? { config: patch.config } : {}),
                  ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
                }
              : patch.isDefault === true
              ? { ...p, isDefault: false }
              : p,
          ),
        ),
      );

      try {
        const { error: updateError } = await supabase
          .from(TABLE)
          .update(dbPatch)
          .eq("id", id)
          .eq("user_id", userId);
        if (updateError) throw updateError;
      } catch (err) {
        console.error("[useDashboardPresets] update error", err);
        setError("Não foi possível atualizar a configuração.");
        setPresets(prevList); // rollback
      }
    },
    [userId, presets],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) return;
      const prevList = presets;
      // Otimista
      setPresets((prev) => prev.filter((p) => p.id !== id));
      try {
        const { error: deleteError } = await supabase
          .from(TABLE)
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (deleteError) throw deleteError;
      } catch (err) {
        console.error("[useDashboardPresets] delete error", err);
        setError("Não foi possível excluir a configuração.");
        setPresets(prevList); // rollback
      }
    },
    [userId, presets],
  );

  const setDefault = useCallback(
    async (id: string): Promise<void> => {
      await update(id, { isDefault: true });
    },
    [update],
  );

  const defaultPreset = useMemo(
    () => presets.find((p) => p.isDefault) ?? null,
    [presets],
  );

  return {
    presets,
    defaultPreset,
    isLoading,
    error,
    refresh: fetchData,
    create,
    update,
    remove,
    setDefault,
  };
}

/** Ordena: default primeiro, depois alfabético. */
function sortPresets(list: DashboardPreset[]): DashboardPreset[] {
  return [...list].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}
