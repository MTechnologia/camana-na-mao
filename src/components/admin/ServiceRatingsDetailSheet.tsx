import { useEffect, useState } from "react";
import { Star, MapPin, BarChart3, AlertTriangle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceRatingsAggregate } from "@/hooks/useRatingsConcentration";
import { cn } from "@/lib/utils";

/**
 * HU-4.2 — Painel lateral com detalhes das avaliações de um equipamento.
 *
 * Aberto ao clicar numa bolha do RatingsBubbleMap. Mostra:
 *   - Header: nome, tipo, distrito, média de estrelas, # avaliações, polarização
 *   - Distribuição de estrelas (barras 1-5)
 *   - Top 3 dimensões com pior média
 *   - Lista de comentários crus mais recentes (até 30, com estrela e data)
 */

interface RawComment {
  id: string;
  ratingStars: number;
  ratingText: string | null;
  createdAt: string | null;
  sentiment: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function avgColorClass(avg: number): string {
  if (avg >= 4) return "text-emerald-600";
  if (avg >= 3) return "text-amber-600";
  return "text-destructive";
}

interface Props {
  selected: ServiceRatingsAggregate | null;
  onClose: () => void;
}

export function ServiceRatingsDetailSheet({ selected, onClose }: Props) {
  const [comments, setComments] = useState<RawComment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) {
      setComments([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("service_ratings")
      .select("id, rating_stars, rating_text, sentiment, created_at")
      .eq("service_id", selected.serviceId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[ServiceRatingsDetailSheet] erro ao carregar comentários", error);
          setComments([]);
        } else {
          setComments(
            (data ?? []).map((r) => {
              const rr = r as Record<string, unknown>;
              return {
                id: String(rr.id),
                ratingStars: Number(rr.rating_stars ?? 0),
                ratingText: (rr.rating_text as string | null) ?? null,
                createdAt: (rr.created_at as string | null) ?? null,
                sentiment: (rr.sentiment as string | null) ?? null,
              };
            }),
          );
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const open = !!selected;
  const maxStarBucket = Math.max(...(selected?.starsDistribution ?? [0]), 1);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-base flex items-center gap-2 truncate">
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="truncate">{selected?.serviceName ?? "Detalhes do serviço"}</span>
          </SheetTitle>
          <SheetDescription className="text-xs flex flex-wrap gap-2 items-center">
            {selected?.serviceType && <Badge variant="outline">{selected.serviceType}</Badge>}
            {selected?.district && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {selected.district}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* KPIs */}
          {selected && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded border p-3">
                <div
                  className={cn(
                    "text-2xl font-bold tabular-nums flex items-center justify-center gap-1",
                    avgColorClass(selected.avgStars),
                  )}
                >
                  {selected.avgStars.toFixed(2)}
                  <Star className="h-4 w-4 fill-current" />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Média de estrelas</div>
              </div>
              <div className="rounded border p-3">
                <div className="text-2xl font-bold tabular-nums">{selected.count}</div>
                <div className="text-[10px] text-muted-foreground mt-1">Avaliações</div>
              </div>
              <div className="rounded border p-3">
                <div className="text-2xl font-bold tabular-nums">{selected.polarizationIndex}%</div>
                <div className="text-[10px] text-muted-foreground mt-1">Polarização</div>
              </div>
            </div>
          )}

          {/* Distribuição de estrelas */}
          {selected && (
            <section>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Distribuição</h3>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = selected.starsDistribution[stars - 1];
                  const pct = selected.count > 0 ? (count / selected.count) * 100 : 0;
                  const widthPct = (count / maxStarBucket) * 100;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-0.5 w-10 shrink-0">
                        {Array.from({ length: stars }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />
                        ))}
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary rounded"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="tabular-nums w-12 text-right text-muted-foreground">
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Top dimensões com pior média */}
          {selected && selected.worstDimensions.length > 0 && (
            <section>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Pontos de atenção (dimensões com avaliação baixa)
              </h3>
              <ul className="space-y-1 text-sm">
                {selected.worstDimensions.map((d) => (
                  <li key={d.name} className="flex items-center justify-between">
                    <span>{d.name}</span>
                    <span className="font-medium tabular-nums text-destructive">
                      {d.avg.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Comentários crus */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              Avaliações recentes ({comments.length})
            </h3>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem avaliações com texto.</p>
            ) : (
              <ul className="space-y-2">
                {comments
                  .filter((c) => c.ratingText && c.ratingText.trim().length > 0)
                  .slice(0, 30)
                  .map((c) => (
                    <li key={c.id} className="text-sm border-l-2 border-muted pl-3 py-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: c.ratingStars }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />
                          ))}
                        </span>
                        <span>· {formatDate(c.createdAt)}</span>
                        {c.sentiment && (
                          <Badge variant="outline" className="text-[10px]">
                            {c.sentiment}
                          </Badge>
                        )}
                      </div>
                      <p>{c.ratingText}</p>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
