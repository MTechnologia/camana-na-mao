import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "@/components/evaluation/RatingStars";
import { usePublishedServiceRatings } from "@/hooks/usePublishedServiceRatings";
import { formatDateTime } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

export const SERVICE_RATINGS_HISTORY_PAGE_SIZE = 8;

type ServiceRatingsHistorySectionProps = {
  /** UUID do equipamento em `public_services`; sem isso a seção não carrega. */
  serviceId: string | null;
  currentUserId?: string | null;
  className?: string;
  /** âncora para acessibilidade / links (#id) */
  id?: string;
};

/** Páginas visíveis com reticências quando há muitas (ex.: 1 … 4 5 6 … 12). */
function visiblePageIndices(totalPages: number, current: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  for (const p of [...set]) {
    if (p < 1 || p > totalPages) set.delete(p);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("gap");
    out.push(p);
    prev = p;
  }
  return out;
}

export function ServiceRatingsHistorySection({
  serviceId,
  currentUserId,
  className,
  id = "historico-avaliacoes",
}: ServiceRatingsHistorySectionProps) {
  const [page, setPage] = useState(1);
  const { ratings, totalCount, loading, error } = usePublishedServiceRatings(
    serviceId,
    page,
    SERVICE_RATINGS_HISTORY_PAGE_SIZE,
  );

  const sectionRef = useRef<HTMLDivElement>(null);
  const skipScrollRef = useRef(true);

  useEffect(() => {
    setPage(1);
    skipScrollRef.current = true;
  }, [serviceId]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / SERVICE_RATINGS_HISTORY_PAGE_SIZE)),
    [totalCount],
  );

  const rangeLabel = useMemo(() => {
    if (totalCount <= 0) return null;
    const start = (page - 1) * SERVICE_RATINGS_HISTORY_PAGE_SIZE + 1;
    const end = Math.min(page * SERVICE_RATINGS_HISTORY_PAGE_SIZE, totalCount);
    return `Mostrando ${start}–${end} de ${totalCount} avaliações`;
  }, [page, totalCount]);

  const pageButtons = useMemo(() => visiblePageIndices(totalPages, page), [totalPages, page]);

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [page]);

  if (!serviceId) {
    return null;
  }

  return (
    <Card ref={sectionRef} id={id} className={cn("scroll-mt-4", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden />
          Histórico de avaliações individuais
        </CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          Cada item é uma avaliação publicada neste equipamento (estrelas e comentário). A lista
          respeita as regras de visibilidade e moderação.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar o histórico: {error}
          </p>
        )}

        {loading && (
          <div className="space-y-3" aria-busy="true" aria-label="Carregando avaliações">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        )}

        {!loading && !error && ratings.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            Ainda não há avaliações publicadas para exibir aqui.
          </p>
        )}

        {!loading && ratings.length > 0 && (
          <ul
            className="space-y-3 list-none m-0 p-0"
            aria-label={rangeLabel ?? "Lista de avaliações"}
          >
            {ratings.map((r, idx) => {
              const isMine = currentUserId != null && r.user_id === currentUserId;
              const showAnonymousNote = Boolean(r.is_anonymous) && isMine;
              const globalIndex = (page - 1) * SERVICE_RATINGS_HISTORY_PAGE_SIZE + idx + 1;
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground tabular-nums shrink-0">
                        #{globalIndex}
                      </span>
                      <RatingStars rating={r.rating_stars} readonly size="sm" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.created_at ? (
                        <time className="text-xs text-muted-foreground" dateTime={r.created_at}>
                          {formatDateTime(r.created_at)}
                        </time>
                      ) : null}
                      {showAnonymousNote ? (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          Sua avaliação (anônima para outros)
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  {r.rating_text?.trim() ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {r.rating_text.trim()}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sem comentário escrito.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !error && totalCount > 0 && (
          <nav
            className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 pt-3 border-t border-border/60"
            aria-label="Paginação do histórico de avaliações"
          >
            {rangeLabel ? (
              <p className="text-sm text-muted-foreground text-center sm:text-left order-first sm:order-none sm:mr-auto">
                {rangeLabel}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-center gap-1">
              {totalPages > 1 &&
                pageButtons.map((item, i) =>
                  item === "gap" ? (
                    <span
                      key={`gap-${i}`}
                      className="px-1 text-muted-foreground text-sm"
                      aria-hidden
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      type="button"
                      variant={item === page ? "secondary" : "ghost"}
                      size="sm"
                      className="min-w-9 px-2"
                      onClick={() => setPage(item)}
                      aria-label={`Ir para página ${item}`}
                      aria-current={item === page ? "page" : undefined}
                    >
                      {item}
                    </Button>
                  ),
                )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" aria-hidden />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-1 tabular-nums">
                Página {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Próxima
                <ChevronRight className="w-4 h-4 ml-1" aria-hidden />
              </Button>
            </div>
          </nav>
        )}
      </CardContent>
    </Card>
  );
}
