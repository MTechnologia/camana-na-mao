import { useMemo } from "react";
import {
  AlertTriangle,
  Bus,
  Megaphone,
  Mic2,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityItem, ActivityKind } from "@/hooks/useLiveActivityFeed";

/**
 * HU-1.5 — Feed lateral de atividade recente em tempo real.
 *
 * Renderiza itens do `useLiveActivityFeed` com badge colorido por tipo,
 * timestamp relativo, e divisor por dia. O feed é "scrollable" e mantém
 * o auto-update do hook.
 */

interface LiveActivityFeedProps {
  items: ActivityItem[];
  isLoading: boolean;
  className?: string;
  maxHeight?: string;
}

const KIND_META: Record<
  ActivityKind,
  { label: string; icon: LucideIcon; color: string }
> = {
  urban_report: {
    label: "Urbano",
    icon: AlertTriangle,
    color: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
  },
  transport_report: {
    label: "Transporte",
    icon: Bus,
    color: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  audiencia_inscricao: {
    label: "Lembrete",
    icon: Megaphone,
    color: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
  },
  audiencia_participacao: {
    label: "Participação",
    icon: Mic2,
    color: "text-green-600 dark:text-green-400 bg-green-500/10",
  },
};

export function LiveActivityFeed({
  items,
  isLoading,
  className,
  maxHeight = "560px",
}: LiveActivityFeedProps) {
  const grouped = useMemo(() => {
    // Agrupa por data (yyyy-MM-dd) preservando ordem
    const map = new Map<string, ActivityItem[]>();
    items.forEach((item) => {
      const day = item.timestamp.slice(0, 10);
      const list = map.get(day) || [];
      list.push(item);
      map.set(day, list);
    });
    return Array.from(map.entries());
  }, [items]);

  return (
    <Card className={cn("p-4 flex flex-col", className)}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold">Atividade recente</h3>
        <span className="text-[10px] text-muted-foreground">
          últimos {items.length}
        </span>
      </div>

      {isLoading && items.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nenhuma atividade recente.
        </p>
      ) : (
        <div className="overflow-y-auto pr-1 space-y-3" style={{ maxHeight }}>
          {grouped.map(([day, dayItems]) => {
            const dayLabel = formatDayHeader(day);
            return (
              <div key={day} className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                  {dayLabel}
                </p>
                {dayItems.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon ?? PenLine;
  const isCritical =
    item.severity?.toLowerCase().includes("crít") ||
    item.severity?.toLowerCase().includes("crit") ||
    item.severity?.toLowerCase() === "alta" ||
    item.severity?.toLowerCase() === "alto";

  let relative = "";
  try {
    relative = formatDistanceToNow(parseISO(item.timestamp), {
      locale: ptBR,
      addSuffix: true,
    });
  } catch {
    relative = item.timestamp.slice(11, 16);
  }

  return (
    <div className="flex items-start gap-2 rounded-md border border-border/50 p-2 hover:bg-muted/30 transition-colors">
      <div
        className={cn(
          "rounded-full p-1.5 shrink-0",
          meta.color,
          isCritical && "ring-2 ring-destructive/40",
        )}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-medium truncate flex-1">{item.title}</p>
          <span className="text-[10px] text-muted-foreground shrink-0">{relative}</span>
        </div>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {item.subtitle}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1">
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
            {meta.label}
          </Badge>
          {isCritical && (
            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-destructive text-destructive-foreground">
              Crítico
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDayHeader(dayIso: string): string {
  try {
    const date = parseISO(dayIso);
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const yesterday = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
    if (dayIso === todayIso) return "Hoje";
    if (dayIso === yesterday) return "Ontem";
    return format(date, "d 'de' MMMM", { locale: ptBR });
  } catch {
    return dayIso;
  }
}
