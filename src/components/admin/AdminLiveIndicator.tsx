import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * HU-1.5 — Indicador "ao vivo" do dashboard executivo.
 *
 * Exibe um ponto verde piscando + texto "Atualizado há Xs / X min" baseado
 * no `lastUpdate` recebido. O texto se atualiza a cada 5s para refletir o
 * tempo decorrido.
 */

type AdminLiveIndicatorTone = "default" | "analyticsBar";

interface AdminLiveIndicatorProps {
  lastUpdate: Date | null;
  className?: string;
  /** Contraste para barra global escura (Dashboard, Gestão, Encaminhamentos). */
  tone?: AdminLiveIndicatorTone;
  /** Exibe apenas "Ao vivo" (sem o sufixo "• atualizado …") — usado no mobile. */
  compact?: boolean;
}

const toneStyles: Record<AdminLiveIndicatorTone, { root: string; muted: string }> = {
  default: {
    root: "bg-green-500/10 text-green-700 dark:text-green-400",
    muted: "text-muted-foreground",
  },
  analyticsBar: {
    root: "bg-white/10 text-analytics-bar-foreground",
    muted: "text-analytics-bar-foreground/90",
  },
};

function formatRelative(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const seconds = Math.max(0, Math.round(diffMs / 1000));

  if (seconds < 5) return "agora";
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  return `há ${days}d`;
}

export function AdminLiveIndicator({
  lastUpdate,
  className,
  tone = "default",
  compact = false,
}: AdminLiveIndicatorProps) {
  const styles = toneStyles[tone];
  const [, force] = useState(0);

  // Atualiza o texto relativo a cada 5s (desnecessário no modo compacto).
  useEffect(() => {
    if (compact) return;
    const id = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, [compact]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
        styles.root,
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span>
        Ao vivo
        {!compact && lastUpdate && (
          <span className={cn("ml-1", styles.muted)}>
            • atualizado {formatRelative(lastUpdate)}
          </span>
        )}
      </span>
    </div>
  );
}
