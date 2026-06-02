import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_THEME_ID,
  WIDGET_CONFIG_SCHEMA_VERSION,
  type WidgetConfig,
  type WidgetThemeId,
} from "@/lib/widgetThemes";

/**
 * HU-6.1 — Estado compartilhado de "tema de atuação" do gestor.
 *
 * Antes era apenas um hook (`useWidgetTheme`) com state local; isso quebrava
 * a UX porque cada chamada do hook (ex.: ThemeSwitcher + ReportsAnalyticsPage)
 * tinha state isolado e a troca no dropdown só refletia no resto da página
 * após F5. Agora a fonte da verdade é um Context Provider único.
 *
 * Uso:
 *   - Coloque <WidgetThemeProvider> em um nível alto da árvore admin
 *     (ex.: dentro do AdminLayout).
 *   - Consuma com `useWidgetTheme()` em qualquer componente filho.
 */

const PERSIST_DEBOUNCE_MS = 400;
const TABLE = "admin_widget_preferences" as const;

export interface UseWidgetThemeResult {
  /** Tema atualmente selecionado pelo usuário (ou `geral` se não carregou). */
  theme: WidgetThemeId;
  /** Config adicional de widgets (tabs ocultas, ordem custom). */
  widgetConfig: WidgetConfig;
  /** Indica que ainda não carregou do servidor (mostra valor padrão). */
  isLoading: boolean;
  /** Último erro de persistência. UI pode mostrar toast. */
  error: string | null;
  setTheme: (next: WidgetThemeId) => void;
  setWidgetConfig: (patch: Partial<WidgetConfig>) => void;
  /** Restaura para o default 'geral' e limpa widget_config. */
  reset: () => void;
}

const WidgetThemeContext = createContext<UseWidgetThemeResult | undefined>(undefined);

interface WidgetThemeProviderProps {
  children: ReactNode;
}

export function WidgetThemeProvider({ children }: WidgetThemeProviderProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [theme, setThemeState] = useState<WidgetThemeId>(DEFAULT_THEME_ID);
  const [widgetConfig, setWidgetConfigState] = useState<WidgetConfig>({
    version: WIDGET_CONFIG_SCHEMA_VERSION,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const serverSnapshotRef = useRef<{ theme: WidgetThemeId; widgetConfig: WidgetConfig } | null>(
    null,
  );
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(true);
  isLoadingRef.current = isLoading;

  // 1) Carga inicial sempre que o user logado mudar.
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    (async () => {
      try {
        const { data, error: selectError } = await supabase
          .from(TABLE)
          .select("theme, widget_config")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (selectError) throw selectError;
        const loadedTheme = (data?.theme as WidgetThemeId) ?? DEFAULT_THEME_ID;
        const loadedConfig: WidgetConfig = (data?.widget_config as WidgetConfig) ?? {
          version: WIDGET_CONFIG_SCHEMA_VERSION,
        };
        serverSnapshotRef.current = { theme: loadedTheme, widgetConfig: loadedConfig };
        setThemeState(loadedTheme);
        setWidgetConfigState(loadedConfig);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("[WidgetThemeProvider] load error", err);
        setError("Não foi possível carregar suas preferências de tema.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 2) Persistência debounced.
  const schedulePersist = useCallback(
    (nextTheme: WidgetThemeId, nextConfig: WidgetConfig) => {
      if (isLoadingRef.current) return;
      if (!userId) return;
      const snap = serverSnapshotRef.current;
      if (
        snap &&
        snap.theme === nextTheme &&
        JSON.stringify(snap.widgetConfig) === JSON.stringify(nextConfig)
      ) {
        return;
      }
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(async () => {
        try {
          const payload = {
            user_id: userId,
            theme: nextTheme,
            widget_config: { ...nextConfig, version: WIDGET_CONFIG_SCHEMA_VERSION },
          };
          const { error: upsertError } = await supabase.from(TABLE).upsert(payload, {
            onConflict: "user_id",
          });
          if (upsertError) throw upsertError;
          serverSnapshotRef.current = { theme: nextTheme, widgetConfig: nextConfig };
          setError(null);
        } catch (err) {
          console.error("[WidgetThemeProvider] persist error", err);
          setError("Não foi possível salvar sua preferência de tema.");
        }
      }, PERSIST_DEBOUNCE_MS);
    },
    [userId],
  );

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  const setTheme = useCallback(
    (next: WidgetThemeId) => {
      setThemeState(next);
      schedulePersist(next, widgetConfig);
    },
    [schedulePersist, widgetConfig],
  );

  const setWidgetConfig = useCallback(
    (patch: Partial<WidgetConfig>) => {
      setWidgetConfigState((prev) => {
        const merged: WidgetConfig = { ...prev, ...patch, version: WIDGET_CONFIG_SCHEMA_VERSION };
        schedulePersist(theme, merged);
        return merged;
      });
    },
    [schedulePersist, theme],
  );

  const reset = useCallback(() => {
    setThemeState(DEFAULT_THEME_ID);
    setWidgetConfigState({ version: WIDGET_CONFIG_SCHEMA_VERSION });
    schedulePersist(DEFAULT_THEME_ID, { version: WIDGET_CONFIG_SCHEMA_VERSION });
  }, [schedulePersist]);

  const value = useMemo<UseWidgetThemeResult>(
    () => ({ theme, widgetConfig, isLoading, error, setTheme, setWidgetConfig, reset }),
    [theme, widgetConfig, isLoading, error, setTheme, setWidgetConfig, reset],
  );

  return <WidgetThemeContext.Provider value={value}>{children}</WidgetThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- Context pattern: Provider + hook in same file
export function useWidgetTheme(): UseWidgetThemeResult {
  const ctx = useContext(WidgetThemeContext);
  if (!ctx) {
    throw new Error("useWidgetTheme deve ser usado dentro de <WidgetThemeProvider>");
  }
  return ctx;
}
