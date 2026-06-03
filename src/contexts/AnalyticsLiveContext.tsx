import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AnalyticsLiveSource = {
  lastUpdate: Date | null;
  refresh?: () => void;
};

type RegisterFn = (id: string, source: AnalyticsLiveSource) => () => void;

type AnalyticsLiveContextValue = {
  register: RegisterFn;
  lastUpdate: Date | null;
  refreshAll: () => void;
};

const AnalyticsLiveContext = createContext<AnalyticsLiveContextValue | null>(null);

function pickMostRecent(sources: Map<string, AnalyticsLiveSource>): Date | null {
  let latest: Date | null = null;
  for (const source of sources.values()) {
    const d = source.lastUpdate;
    if (d && (!latest || d.getTime() > latest.getTime())) latest = d;
  }
  return latest;
}

/** Agrega indicadores "Ao vivo" de várias fontes na mesma sessão admin. */
export function AnalyticsLiveProvider({ children }: { children: ReactNode }) {
  const sourcesRef = useRef(new Map<string, AnalyticsLiveSource>());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const recompute = useCallback(() => {
    setLastUpdate(pickMostRecent(sourcesRef.current));
  }, []);

  const register = useCallback<RegisterFn>(
    (id, source) => {
      sourcesRef.current.set(id, source);
      recompute();
      return () => {
        sourcesRef.current.delete(id);
        recompute();
      };
    },
    [recompute],
  );

  const refreshAll = useCallback(() => {
    for (const source of sourcesRef.current.values()) {
      source.refresh?.();
    }
  }, []);

  const value = useMemo(
    () => ({ register, lastUpdate, refreshAll }),
    [register, lastUpdate, refreshAll],
  );

  return <AnalyticsLiveContext.Provider value={value}>{children}</AnalyticsLiveContext.Provider>;
}

export function useAnalyticsLive(): AnalyticsLiveContextValue {
  const ctx = useContext(AnalyticsLiveContext);
  if (!ctx) {
    throw new Error("useAnalyticsLive must be used within AnalyticsLiveProvider");
  }
  return ctx;
}

export function useOptionalAnalyticsLive(): AnalyticsLiveContextValue | null {
  return useContext(AnalyticsLiveContext);
}
