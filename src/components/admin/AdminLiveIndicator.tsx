import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * HU-1.5 — Indicador "ao vivo" do dashboard executivo.
 *
 * Exibe um ponto verde piscando + texto "Atualizado há Xs / X min" baseado
 * no `lastUpdate` recebido. O texto se atualiza a cada 5s para refletir o
 * tempo decorrido.
 */

interface AdminLiveIndicatorProps {
  lastUpdate: Date | null;
  className?: string;
}

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

export function AdminLiveIndicator({ lastUpdate, className }: AdminLiveIndicatorProps) {
  const [, force] = useState(0);

  // Atualiza o texto relativo a cada 5s
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400",
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
        {lastUpdate && (
          <span className="ml-1 text-muted-foreground">• atualizado {formatRelative(lastUpdate)}</span>
        )}
      </span>
    </div>
  );
}
