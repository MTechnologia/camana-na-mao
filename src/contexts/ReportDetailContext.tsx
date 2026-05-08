import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * HU-3.6 — Estado global do drill-through de relato individual.
 *
 * Permite que qualquer componente da app abra o sheet de detalhe passando
 * apenas (id, source). O sheet em si vive no AdminLayout (ou similar) e
 * escuta esse contexto para abrir/fechar.
 */

export type ReportSource = "urban" | "transport";

interface OpenedReport {
  id: string;
  source: ReportSource;
}

interface ReportDetailContextValue {
  /** Relato aberto no sheet, ou null. */
  opened: OpenedReport | null;
  /** Abre o sheet com o relato indicado. */
  open: (id: string, source: ReportSource) => void;
  /** Fecha o sheet. */
  close: () => void;
}

const Ctx = createContext<ReportDetailContextValue | null>(null);

export function ReportDetailProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState<OpenedReport | null>(null);

  const open = useCallback((id: string, source: ReportSource) => {
    setOpened({ id, source });
  }, []);
  const close = useCallback(() => setOpened(null), []);

  const value = useMemo<ReportDetailContextValue>(
    () => ({ opened, open, close }),
    [opened, open, close],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReportDetailModal(): ReportDetailContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback no-op para componentes fora do Provider (não quebram em testes/storybook)
    return {
      opened: null,
      open: () => {
        if (typeof window !== "undefined") {
          // eslint-disable-next-line no-console
          console.warn("useReportDetailModal usado fora de ReportDetailProvider");
        }
      },
      close: () => {},
    };
  }
  return ctx;
}
