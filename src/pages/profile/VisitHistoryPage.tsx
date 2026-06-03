import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PageHeader from "@/components/ui/page-header";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ServiceTypeIcon } from "@/components/icons";
import { useVisitHistory } from "@/hooks/useVisitHistory";
import { formatVisitDurationMs } from "@/lib/closeServiceVisitDeparture";
import { getVisitHistoryUiStatus } from "@/lib/visitHistoryStatus";
import { getServiceDisplayName } from "@/lib/mapUtils";
import BulkDeleteConfirmDialog, {
  VISIT_BULK_DELETE_COPY,
} from "@/components/shared/BulkDeleteConfirmDialog";
import {
  CITIZEN_LIST_PAGE_SIZE,
  ListPagination,
  paginateSlice,
  totalListPages,
} from "@/components/shared/ListPagination";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, Timer, AlertCircle, Trash2 } from "lucide-react";

function formatVisitDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: format(d, "dd/MM/yyyy", { locale: ptBR }),
    time: format(d, "HH:mm", { locale: ptBR }),
  };
}

export default function VisitHistoryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { visits, loading, error, deleteVisits, deleteAllVisits } = useVisitHistory();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<"selected" | "all">("selected");

  const visitTotalPages = totalListPages(visits.length, CITIZEN_LIST_PAGE_SIZE);

  useEffect(() => {
    if (page > visitTotalPages) {
      setPage(visitTotalPages);
    }
  }, [page, visitTotalPages]);

  const paginatedVisits = useMemo(
    () => paginateSlice(visits, page, CITIZEN_LIST_PAGE_SIZE),
    [visits, page],
  );

  const allSelected = visits.length > 0 && visits.every((v) => selectedIds.has(v.id));
  const selectedCount = selectedIds.size;

  const toggleSelection = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        visits.forEach((v) => next.delete(v.id));
        return next;
      }
      const next = new Set(prev);
      visits.forEach((v) => next.add(v.id));
      return next;
    });
  }, [allSelected, visits]);

  const openBulkDelete = (mode: "selected" | "all") => {
    setBulkDeleteMode(mode);
    setBulkDeleteOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (bulkDeleteMode === "all") {
      const count = await deleteAllVisits();
      if (count > 0) {
        setSelectedIds(new Set());
        toast({
          title: "Histórico limpo",
          description: `${count} visita${count === 1 ? "" : "s"} removida${count === 1 ? "" : "s"}.`,
        });
      }
    } else {
      const ids = Array.from(selectedIds);
      const count = await deleteVisits(ids);
      if (count > 0) {
        setSelectedIds(new Set());
        toast({
          title: "Visitas excluídas",
          description: `${count} visita${count === 1 ? "" : "s"} removida${count === 1 ? "" : "s"}.`,
        });
      }
    }
    setBulkDeleteOpen(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Histórico de visitas" backTo="/perfil" />
      <div className="px-4 pb-6 space-y-4">
        <ProfilePageHeader subtitle="Equipamentos públicos detectados pelo app" />

        <p className="text-sm text-muted-foreground leading-relaxed px-1">
          A <strong>entrada</strong> é registrada após permanência mínima no local. A{" "}
          <strong>saída</strong> pode ser detectada pelo GPS (com o app rastreando localização) ou
          registrada ao avaliar, dispensar ou expirar a visita.
        </p>

        {!loading && visits.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => toggleSelectAll()}
                aria-label="Selecionar todas as visitas"
              />
              Selecionar todas
            </label>
            {selectedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => openBulkDelete("selected")}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir ({selectedCount})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
              onClick={() => openBulkDelete("all")}
            >
              Limpar todas
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              Nenhuma visita registrada ainda. Permaneça próximo a um equipamento público (com
              localização ativa) para que o sistema possa detectar sua visita.
            </CardContent>
          </Card>
        ) : (
          <>
            <ul className="space-y-3 list-none p-0 m-0">
              {paginatedVisits.map((visit) => {
                const svc = visit.service;
                const serviceType = svc?.service_type ?? "other";
                const displayName = svc
                  ? getServiceDisplayName({
                      name: svc.name,
                      address: svc.address ?? undefined,
                      district: svc.district ?? undefined,
                      service_type: svc.service_type,
                    })
                  : "Equipamento";
                const ui = getVisitHistoryUiStatus(visit);
                const entry = formatVisitDateTime(visit.created_at);
                const exitFmt = visit.departed_at ? formatVisitDateTime(visit.departed_at) : null;
                const durationMs =
                  visit.departed_at && visit.created_at
                    ? new Date(visit.departed_at).getTime() - new Date(visit.created_at).getTime()
                    : null;

                return (
                  <li key={visit.id}>
                    <Card className="border-border/80 overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex gap-3">
                          <Checkbox
                            checked={selectedIds.has(visit.id)}
                            onCheckedChange={(checked) =>
                              toggleSelection(visit.id, checked === true)
                            }
                            aria-label={`Selecionar visita ${displayName}`}
                            className="mt-2 shrink-0"
                          />
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ServiceTypeIcon serviceType={serviceType} size={22} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground text-sm leading-snug">
                              {displayName}
                            </h3>
                            {svc?.district ? (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {svc.district}
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            {ui === "evaluated" && (
                              <Badge className="bg-green-600 hover:bg-green-600 text-white border-0">
                                Avaliado
                              </Badge>
                            )}
                            {ui === "expired" && (
                              <Badge
                                variant="secondary"
                                className="bg-muted text-muted-foreground font-normal"
                              >
                                Expirado
                              </Badge>
                            )}
                            {ui === "skipped" && (
                              <Badge
                                variant="secondary"
                                className="bg-muted text-muted-foreground font-normal"
                              >
                                Dispensado
                              </Badge>
                            )}
                            {ui === "open_for_rating" && (
                              <Badge
                                variant="outline"
                                className="text-amber-700 border-amber-300 bg-amber-50"
                              >
                                Pendente
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4 pl-7">
                          <div>
                            <p className="flex items-center gap-1 font-medium text-foreground/80">
                              <Clock className="h-3 w-3" />
                              Entrada
                            </p>
                            <p className="mt-0.5 pl-4">
                              {entry.date}
                              <br />
                              <span className="tabular-nums">{entry.time}</span>
                            </p>
                          </div>
                          <div>
                            <p className="flex items-center gap-1 font-medium text-foreground/80">
                              <Clock className="h-3 w-3" />
                              Saída
                            </p>
                            <p className="mt-0.5 pl-4 tabular-nums">
                              {exitFmt ? (
                                <>
                                  {exitFmt.date}
                                  <br />
                                  {exitFmt.time}
                                </>
                              ) : (
                                "—"
                              )}
                            </p>
                          </div>
                          <div className="col-span-2 sm:col-span-2">
                            <p className="flex items-center gap-1 font-medium text-foreground/80">
                              <Timer className="h-3 w-3" />
                              Duração
                            </p>
                            <p className="mt-0.5 pl-4 tabular-nums">
                              {durationMs != null ? formatVisitDurationMs(durationMs) : "—"}
                            </p>
                          </div>
                        </div>

                        {ui === "open_for_rating" && (
                          <Button
                            className="w-full ml-7 max-w-[calc(100%-1.75rem)]"
                            onClick={() => navigate(`/avaliar/${visit.id}`)}
                          >
                            Avaliar
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
            <ListPagination
              page={page}
              totalPages={visitTotalPages}
              totalCount={visits.length}
              pageSize={CITIZEN_LIST_PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <BulkDeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        count={bulkDeleteMode === "all" ? visits.length : selectedCount}
        mode={bulkDeleteMode}
        copy={VISIT_BULK_DELETE_COPY}
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
